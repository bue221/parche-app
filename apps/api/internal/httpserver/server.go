package httpserver

import (
	"context"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/admin"
	"github.com/parche-app/backend/internal/applog"
	"github.com/parche-app/backend/internal/artists"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/config"
	"github.com/parche-app/backend/internal/demoseed"
	"github.com/parche-app/backend/internal/editorial"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/health"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/media"
	"github.com/parche-app/backend/internal/objectstore"
	"github.com/parche-app/backend/internal/payments"
	"github.com/parche-app/backend/internal/postgres"
	"github.com/parche-app/backend/internal/ratelimit"
	"github.com/parche-app/backend/internal/recs"
	"github.com/parche-app/backend/internal/redisx"
	"github.com/parche-app/backend/internal/ticketsign"
	"github.com/parche-app/backend/internal/venues"
)

// Routes are product handlers that sit on the F02 mux. Optional until later features wire them.
type Routes struct {
	Store         objectstore.Store
	Access        Access
	Events        EventWrite
	Catalog       *events.Service
	Auth          *auth.Service
	Venues        *venues.Service
	Media         *media.Service
	Artists       *artists.Service
	Posts         *editorial.Service
	Recs          *recs.Service
	Payments      payments.Provider
	WebhookSecret string
	AppEnv        string
	Audit         admin.Auditor
}

// NewMux registers process health routes and the /v1 product prefix with HTTP contract middleware.
func NewMux(log *applog.Logger, cfg config.Config, limiter ratelimit.Limiter, checkers ...health.Checker) http.Handler {
	return newMux(log, cfg, limiter, checkers, nil, Routes{})
}

func newMux(log *applog.Logger, cfg config.Config, limiter ratelimit.Limiter, checkers []health.Checker, extra func(*http.ServeMux), routes Routes) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /health", health.Health())
	mux.Handle("GET /ready", health.Ready(log, checkers...))
	registerUploadRoutes(mux, routes)
	registerAuthRoutes(mux, routes)
	registerVenueRoutes(mux, routes)
	registerClubRoutes(mux, routes)
	registerEventRoutes(mux, routes)
	registerAssetRoutes(mux, routes)
	registerTrackRoutes(mux, routes)
	registerArtistRoutes(mux, routes)
	registerPostRoutes(mux, routes)
	registerRecRoutes(mux, routes)
	registerOrderRoutes(mux, routes)
	registerAdminRoutes(mux, routes)
	if extra != nil {
		extra(mux)
	}
	return wrap(&v1Mux{inner: mux}, log, cfg, limiter, routes.Access)
}

// Run connects dependencies, applies migrations, and serves HTTP until ctx is done.
func Run(ctx context.Context, cfg config.Config, log *applog.Logger) error {
	log.Info("opening postgres pool", "database_url", cfg.RedactedDatabaseURL())
	pool, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	migFS, err := migrationsFS()
	if err != nil {
		log.Error("migrations filesystem", "err", err)
	} else if err := postgres.Migrate(ctx, pool, migFS); err != nil {
		log.Error("migrations failed", "err", err)
	}

	rdb, err := redisx.Connect(ctx, cfg.RedisURL)
	if err != nil {
		log.Error("redis client", "err", err)
	} else {
		defer func() { _ = rdb.Close() }()
	}

	store, err := objectstore.New(cfg)
	if err != nil {
		log.Error("object store", "err", err)
	}

	tokens := &auth.Tokens{
		AccessSecret:  []byte(cfg.JWTAccessSecret),
		RefreshPepper: []byte(cfg.JWTRefreshSecret),
	}
	sessions, err := auth.NewService(auth.NewPG(pool), tokens, auth.DefaultArgon2(), log)
	if err != nil {
		log.Error("auth service", "err", err)
	}
	if sessions != nil {
		sessions.Mailer = mailer.Log{Logger: log}
		sessions.AppOrigin = cfg.AppOrigin
		if email := strings.TrimSpace(cfg.BootstrapAdminEmail); email != "" {
			if err := sessions.BootstrapPlatformAdmin(ctx, email); err != nil {
				log.Error("bootstrap platform admin", "err", err)
			} else {
				log.Info("bootstrap platform admin granted")
			}
		}
	}
	access := JWTAccess{Tokens: tokens, Lookup: nil}
	if sessions != nil {
		access.Lookup = sessions.AccessIdentity
	}

	var venueSvc *venues.Service
	if sessions != nil {
		venueSvc = venues.NewService(venues.NewPG(pool), sessions.Store)
	}
	var eventSvc *events.Service
	if sessions != nil && venueSvc != nil {
		vpg := venues.NewPG(pool)
		var cache events.Cache
		if rdb != nil {
			cache = events.RedisCache{Client: rdb}
		} else {
			cache = events.NewMemoryCache()
		}
		eventSvc = events.NewService(events.NewPG(pool), sessions.Store, venueSvc, vpg, cache)
		eventSvc.Mailer = mailer.Log{Logger: log}
		eventSvc.AppOrigin = cfg.AppOrigin
		eventSvc.Pepper = []byte(cfg.JWTRefreshSecret)
		if keys, err := ticketsign.Parse(cfg.TicketSigningKey, cfg.TicketSigningKeys); err != nil {
			log.Error("ticket signing keys", "err", err)
		} else {
			eventSvc.Tickets = keys
		}
		sessions.EventRoles = eventSvc
		if pay, err := payments.New(cfg); err != nil {
			log.Error("payment provider", "err", err)
		} else {
			eventSvc.Payments = pay
		}
	}
	var artistSvc *artists.Service
	if sessions != nil {
		artistSvc = artists.NewService(artists.NewPG(pool), sessions.Store)
	}
	var postSvc *editorial.Service
	if sessions != nil {
		postSvc = editorial.NewService(editorial.NewPG(pool), sessions.Store)
	}
	if artistSvc != nil && eventSvc != nil {
		eventSvc.Lineup = artistSvc
		artistSvc.Catalog = eventSvc
		eventSvc.Followers = artistSvc
	}
	var recSvc *recs.Service
	if eventSvc != nil && artistSvc != nil {
		recSvc = recs.NewService(recs.NewLive(eventSvc, artistSvc), recs.NewPG(pool))
		recSvc.Log = log
	}
	eventWrite := EventWrite(DenyEventWrite{})
	if eventSvc != nil {
		eventWrite = eventSvc
	}
	var mediaSvc *media.Service
	if store != nil && eventSvc != nil {
		mediaSvc = media.NewService(media.NewPG(pool), store, eventSvc)
		eventSvc.Media = mediaSvc
		if artistSvc != nil {
			mediaSvc.Artists = artistSvc
			artistSvc.Avatars = mediaSvc
		}
		if sessions != nil {
			mediaSvc.Users = sessions
		}
		if postSvc != nil {
			mediaSvc.Posts = postSvc
			postSvc.Covers = mediaSvc
		}
	}
	if strings.EqualFold(strings.TrimSpace(cfg.AppEnv), "dev") && sessions != nil && eventSvc != nil {
		if err := demoseed.Run(ctx, demoseed.Deps{
			Auth: sessions, Events: eventSvc, Artists: artistSvc, Media: mediaSvc, Objects: store, Log: log,
		}); err != nil {
			log.Error("demo seed", "err", err)
		}
	}
	if cfg.BrokerURL != "" {
		if nc, js, err := broker.Connect(cfg.BrokerURL); err != nil {
			log.Error("broker publisher", "err", err)
		} else {
			pub := broker.Publisher{JS: js}
			q := mailer.Queue{Pub: pub, Outbox: mailer.NewPG(pool)}
			if sessions != nil {
				sessions.Mailer = q
			}
			if eventSvc != nil {
				eventSvc.Publisher = pub
				eventSvc.Mailer = q
			}
			if mediaSvc != nil {
				mediaSvc.Publisher = pub
			}
			go func() {
				<-ctx.Done()
				nc.Close()
			}()
		}
	}
	var pay payments.Provider
	if eventSvc != nil {
		pay = eventSvc.Payments
	}
	handler := newMux(log, cfg, ratelimit.New(rdb), []health.Checker{
		postgres.Checker{Pool: pool},
		redisx.Checker{Client: rdb},
		objectstore.Checker{Store: store},
	}, nil, Routes{
		Store:         store,
		Access:        access,
		Events:        eventWrite,
		Catalog:       eventSvc,
		Auth:          sessions,
		Venues:        venueSvc,
		Media:         mediaSvc,
		Artists:       artistSvc,
		Posts:         postSvc,
		Recs:          recSvc,
		Payments:      pay,
		WebhookSecret: cfg.PaymentWebhookSecret,
		AppEnv:        cfg.AppEnv,
		Audit:         admin.PG{Pool: pool},
	})

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("api listening", "addr", cfg.HTTPAddr)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	case err := <-errCh:
		if err == http.ErrServerClosed {
			return nil
		}
		return err
	}
}

func migrationsFS() (fs.FS, error) {
	candidates := []string{"migrations", filepath.Join("..", "..", "migrations")}
	for _, dir := range candidates {
		info, err := os.Stat(dir)
		if err == nil && info.IsDir() {
			return os.DirFS(dir), nil
		}
	}
	return nil, fmt.Errorf("migrations directory not found")
}

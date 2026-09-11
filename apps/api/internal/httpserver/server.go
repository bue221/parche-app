package httpserver

import (
	"context"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/parche-app/backend/internal/applog"
	"github.com/parche-app/backend/internal/config"
	"github.com/parche-app/backend/internal/health"
	"github.com/parche-app/backend/internal/objectstore"
	"github.com/parche-app/backend/internal/postgres"
	"github.com/parche-app/backend/internal/ratelimit"
	"github.com/parche-app/backend/internal/redisx"
)

// Routes are product handlers that sit on the F02 mux. Optional until later features wire them.
type Routes struct {
	Store  objectstore.Store
	Access Access
	Events EventWrite
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
	if extra != nil {
		extra(mux)
	}
	return wrap(&v1Mux{inner: mux}, log, cfg, limiter)
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

	handler := newMux(log, cfg, ratelimit.New(rdb), []health.Checker{
		postgres.Checker{Pool: pool},
		redisx.Checker{Client: rdb},
		objectstore.Checker{Store: store},
	}, nil, Routes{
		Store:  store,
		Access: RejectAccess{},
		Events: DenyEventWrite{},
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

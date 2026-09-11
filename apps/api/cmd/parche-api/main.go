package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/parche-app/backend/internal/applog"
	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/config"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/httpserver"
	"github.com/parche-app/backend/internal/media"
	"github.com/parche-app/backend/internal/objectstore"
	"github.com/parche-app/backend/internal/postgres"
	"github.com/parche-app/backend/internal/redisx"
	"github.com/parche-app/backend/internal/worker"
)

func main() {
	cmd := "serve"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		applog.New("error", "api").Error("invalid configuration", "err", err)
		os.Exit(1)
	}

	log := applog.New(cfg.LogLevel, cfg.Service)

	switch cmd {
	case "serve":
		if err := httpserver.Run(ctx, cfg, log); err != nil {
			log.Error("api stopped", "err", err)
			os.Exit(1)
		}
	case "worker":
		nc, js, err := broker.Connect(cfg.BrokerURL)
		if err != nil {
			log.Error("broker connect failed", "err", err)
			os.Exit(1)
		}
		defer nc.Close()
		pool, err := postgres.Connect(ctx, cfg.DatabaseURL)
		if err != nil {
			log.Error("postgres connect failed", "err", err)
			os.Exit(1)
		}
		defer pool.Close()
		store, err := objectstore.New(cfg)
		if err != nil {
			log.Error("object store", "err", err)
			os.Exit(1)
		}
		mediaSvc := media.NewService(media.NewPG(pool), store, nil)
		eventStore := events.NewPG(pool)
		var cache events.Cache
		if rdb, rerr := redisx.Connect(ctx, cfg.RedisURL); rerr != nil {
			log.Error("redis client", "err", rerr)
		} else {
			defer func() { _ = rdb.Close() }()
			cache = events.RedisCache{Client: rdb}
		}
		expire := func(ctx context.Context) (int, error) {
			return eventStore.ExpirePendingOrders(ctx, time.Now().UTC())
		}
		ticketUsed := func(ctx context.Context, job events.TicketScanJob) error {
			if err := events.PersistTicketScan(ctx, eventStore, job); err != nil {
				return err
			}
			events.InvalidateEventMetrics(ctx, cache, job.EventID)
			return nil
		}
		if err := worker.Run(ctx, js, log, worker.Handlers{MediaProcess: mediaSvc.Process, ExpireOrders: expire, TicketUsed: ticketUsed}); err != nil {
			log.Error("worker stopped", "err", err)
			os.Exit(1)
		}
	default:
		log.Error("unknown command", "cmd", cmd)
		os.Exit(1)
	}
}

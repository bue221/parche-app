package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/parche-app/backend/internal/applog"
	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/config"
	"github.com/parche-app/backend/internal/httpserver"
	"github.com/parche-app/backend/internal/media"
	"github.com/parche-app/backend/internal/objectstore"
	"github.com/parche-app/backend/internal/postgres"
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
		if err := worker.Run(ctx, js, log, worker.Handlers{MediaProcess: mediaSvc.Process}); err != nil {
			log.Error("worker stopped", "err", err)
			os.Exit(1)
		}
	default:
		log.Error("unknown command", "cmd", cmd)
		os.Exit(1)
	}
}

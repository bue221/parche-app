package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pool. Ping is deferred to /ready so the process can serve /health
// while Postgres is down.
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	cfg.MaxConns = 10
	cfg.MinConns = 0
	cfg.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}
	return pool, nil
}

// Ping checks that Postgres accepts connections.
func Ping(ctx context.Context, pool *pgxpool.Pool) error {
	return pool.Ping(ctx)
}

// Checker adapts a pool to health.Checker.
type Checker struct {
	Pool *pgxpool.Pool
}

func (c Checker) Name() string { return "postgres" }

func (c Checker) Ping(ctx context.Context) error {
	if c.Pool == nil {
		return fmt.Errorf("postgres pool is nil")
	}
	return Ping(ctx, c.Pool)
}

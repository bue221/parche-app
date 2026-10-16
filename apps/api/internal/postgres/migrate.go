package postgres

import (
	"context"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Migrate applies versioned SQL files from dir in lexical order.
// Failures roll back the current file's transaction.
func Migrate(ctx context.Context, pool *pgxpool.Pool, dir fs.FS) error {
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(dir, ".")
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		names = append(names, e.Name())
	}
	sort.Strings(names)

	for _, name := range names {
		version := strings.TrimSuffix(name, ".sql")
		var exists bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&exists); err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if exists {
			continue
		}

		sqlBytes, err := fs.ReadFile(dir, path.Clean(name))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}

		tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
		if err != nil {
			return fmt.Errorf("begin migration %s: %w", version, err)
		}
		if err := execMigrationSQL(ctx, tx, string(sqlBytes)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("apply migration %s: %w", version, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("record migration %s: %w", version, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit migration %s: %w", version, err)
		}
	}
	return nil
}

func execMigrationSQL(ctx context.Context, tx pgx.Tx, sqlText string) error {
	for _, stmt := range SplitSQL(sqlText) {
		if _, err := tx.Exec(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// SplitSQL breaks a migration file into statements. Line comments are stripped
// first so a semicolon inside `-- ...` cannot split a statement.
func SplitSQL(sqlText string) []string {
	var out []string
	var b strings.Builder
	inString := false
	for i := 0; i < len(sqlText); i++ {
		c := sqlText[i]
		if inString {
			b.WriteByte(c)
			if c == '\'' {
				if i+1 < len(sqlText) && sqlText[i+1] == '\'' {
					b.WriteByte('\'')
					i++
					continue
				}
				inString = false
			}
			continue
		}
		if c == '-' && i+1 < len(sqlText) && sqlText[i+1] == '-' {
			i++
			for i+1 < len(sqlText) && sqlText[i+1] != '\n' {
				i++
			}
			continue
		}
		if c == '\'' {
			inString = true
			b.WriteByte(c)
			continue
		}
		if c == ';' {
			stmt := strings.TrimSpace(b.String())
			if stmt != "" {
				out = append(out, stmt)
			}
			b.Reset()
			continue
		}
		b.WriteByte(c)
	}
	if stmt := strings.TrimSpace(b.String()); stmt != "" {
		out = append(out, stmt)
	}
	return out
}

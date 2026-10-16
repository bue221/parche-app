package applog

import (
	"log/slog"
	"os"
	"strings"
)

// Logger is a JSON slog logger with service field.
type Logger = slog.Logger

// New builds a JSON logger. Passwords must never be passed as attributes.
func New(level, service string) *Logger {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn", "warning":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
	return slog.New(h).With("service", service)
}

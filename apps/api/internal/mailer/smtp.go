package mailer

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/config"
)

// NewTransport picks log, mailhog, or smtp from EMAIL_DRIVER. Secrets stay in env.
func NewTransport(cfg config.Config, log *slog.Logger) (Transport, error) {
	driver := strings.ToLower(strings.TrimSpace(cfg.EmailDriver))
	if driver == "" {
		driver = "log"
	}
	switch driver {
	case "log":
		return Log{Logger: log}, nil
	case "mailhog":
		return SMTP{
			Host: cfg.SMTPHost,
			Port: cfg.SMTPPort,
			From: cfg.EmailFrom,
		}, nil
	case "smtp":
		return SMTP{
			Host:     cfg.SMTPHost,
			Port:     cfg.SMTPPort,
			User:     cfg.SMTPUser,
			Password: cfg.SMTPPassword,
			From:     cfg.EmailFrom,
		}, nil
	default:
		return nil, fmt.Errorf("unknown EMAIL_DRIVER %q (log|mailhog|smtp)", cfg.EmailDriver)
	}
}

// SMTP delivers via net/smtp. Mailhog is the same driver without AUTH.
type SMTP struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
	SendMail func(addr string, a smtp.Auth, from string, to []string, msg []byte) error
}

func (s SMTP) Deliver(_ context.Context, msg Message, mail Compiled) error {
	from := strings.TrimSpace(s.From)
	if from == "" {
		from = "parche@localhost"
	}
	to := strings.TrimSpace(mail.To)
	if to == "" {
		return fmt.Errorf("email to is empty")
	}
	host := strings.TrimSpace(s.Host)
	if host == "" {
		return fmt.Errorf("SMTP_HOST is empty")
	}
	port := strings.TrimSpace(s.Port)
	if port == "" {
		port = "587"
	}
	if _, err := strconv.Atoi(port); err != nil {
		return fmt.Errorf("SMTP_PORT: %w", err)
	}
	addr := net.JoinHostPort(host, port)
	raw := encodeMIME(from, to, mail)
	send := s.SendMail
	if send == nil {
		send = smtp.SendMail
	}
	var auth smtp.Auth
	if strings.TrimSpace(s.User) != "" {
		auth = smtp.PlainAuth("", s.User, s.Password, host)
	}
	if err := send(addr, auth, from, []string{to}, raw); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	_ = msg
	return nil
}

func encodeMIME(from, to string, mail Compiled) []byte {
	boundary := "parche-" + uuid.NewString()
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + sanitizeHeader(mail.Subject) + "\r\n")
	b.WriteString("Date: " + time.Now().UTC().Format(time.RFC1123Z) + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: multipart/alternative; boundary=\"" + boundary + "\"\r\n\r\n")
	b.WriteString("--" + boundary + "\r\n")
	b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n\r\n")
	b.WriteString(mail.Text)
	b.WriteString("\r\n--" + boundary + "\r\n")
	b.WriteString("Content-Type: text/html; charset=UTF-8\r\n\r\n")
	b.WriteString(mail.HTML)
	b.WriteString("\r\n--" + boundary + "--\r\n")
	return []byte(b.String())
}

func sanitizeHeader(s string) string {
	s = strings.ReplaceAll(s, "\r", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	return strings.TrimSpace(s)
}

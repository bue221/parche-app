package mailer

import (
	"html"
	"strings"

	"github.com/parche-app/backend/emails"
)

// Compiled is a rendered template ready for SMTP. Never includes QR tokens or passwords.
type Compiled struct {
	To      string
	Subject string
	Text    string
	HTML    string
}

type templateFile struct {
	subject string
	body    string
}

var catalog map[string]templateFile

func init() {
	catalog = mustLoadTemplates()
}

func mustLoadTemplates() map[string]templateFile {
	out := map[string]templateFile{}
	entries, err := emails.FS.ReadDir(".")
	if err != nil {
		panic("emails fs: " + err.Error())
	}
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".md") {
			continue
		}
		raw, err := emails.FS.ReadFile(name)
		if err != nil {
			panic("emails read " + name + ": " + err.Error())
		}
		id := strings.TrimSuffix(name, ".md")
		out[id] = parseTemplate(string(raw))
	}
	required := []string{
		TemplatePasswordReset, TemplateEventInvite, TemplateEmailChange, TemplateTicketClaim,
		TemplateOrderPaid, TemplateOrderFailed, TemplateEventCancelled, TemplateArtistNewEvent,
		TemplateAdminDigest, TemplateEventRejected,
	}
	for _, id := range required {
		if _, ok := out[id]; !ok {
			panic("missing email template " + id)
		}
	}
	return out
}

func parseTemplate(raw string) templateFile {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	subject := ""
	body := strings.TrimSpace(raw)
	if rest, ok := strings.CutPrefix(body, "subject:"); ok {
		line, after, found := strings.Cut(rest, "\n")
		subject = strings.TrimSpace(line)
		if found {
			body = strings.TrimSpace(after)
			body = strings.TrimPrefix(body, "---")
			body = strings.TrimSpace(body)
		} else {
			body = ""
		}
	}
	return templateFile{subject: subject, body: body}
}

// KnownTemplate reports whether id is a versioned F26 template.
func KnownTemplate(id string) bool {
	_, ok := catalog[strings.TrimSpace(id)]
	return ok
}

// Render fills a versioned template. Unknown templates return false.
func Render(msg Message) (Compiled, bool) {
	tpl, ok := catalog[strings.TrimSpace(msg.Template)]
	if !ok {
		return Compiled{}, false
	}
	vars := SanitizeVars(msg.Vars)
	text := applyVars(tpl.body, vars)
	subject := applyVars(tpl.subject, vars)
	htmlBody := applyVarsHTML(tpl.body, vars)
	return Compiled{
		To:      strings.TrimSpace(msg.To),
		Subject: subject,
		Text:    text,
		HTML:    "<p>" + htmlBody + "</p>",
	}, true
}

func applyVars(s string, vars map[string]string) string {
	for k, v := range vars {
		s = strings.ReplaceAll(s, "{{"+k+"}}", v)
	}
	return s
}

func applyVarsHTML(s string, vars map[string]string) string {
	escaped := html.EscapeString(s)
	for k, v := range vars {
		escaped = strings.ReplaceAll(escaped, "{{"+html.EscapeString(k)+"}}", html.EscapeString(v))
	}
	escaped = strings.ReplaceAll(escaped, "\n\n", "</p><p>")
	escaped = strings.ReplaceAll(escaped, "\n", "<br>\n")
	return escaped
}

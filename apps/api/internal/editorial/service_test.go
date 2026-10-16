package editorial

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

func TestRenderHTMLEscapesXSS(t *testing.T) {
	html := RenderHTML("Hola <script>alert(1)</script> y [x](javascript:alert(1))")
	if strings.Contains(html, "<script>") || strings.Contains(html, `href="javascript:`) {
		t.Fatalf("unsafe html=%s", html)
	}
	if !strings.Contains(html, "&lt;script&gt;") {
		t.Fatalf("expected escaped script, got %s", html)
	}
}

func TestRenderHTMLAllowlist(t *testing.T) {
	html := RenderHTML("# Título\n\nPárrafo **bold** y *em* y `code`.\n\n- uno\n- dos\n\n[ok](https://parche.example/x)")
	for _, want := range []string{"<h1>", "<p>", "<strong>", "<em>", "<code>", "<ul>", "<li>", `href="https://parche.example/x"`} {
		if !strings.Contains(html, want) {
			t.Fatalf("missing %q in %s", want, html)
		}
	}
}

func TestCreatePublishAndHideDraft(t *testing.T) {
	svc := NewService(NewMemory(), nil)
	p, err := svc.Create(context.Background(), "author-1", CreateInput{
		Title: "Acid en Chapinero",
		Body:  "Un **recorrido** por <script>x</script>",
	})
	if err != nil {
		t.Fatal(err)
	}
	if p.Status != StatusDraft || p.Slug == "" {
		t.Fatalf("draft=%+v", p)
	}
	if strings.Contains(p.BodyHTML, "<script>") {
		t.Fatal("xss in draft html")
	}
	if _, err := svc.GetPublished(context.Background(), p.Slug); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("draft leaked: %v", err)
	}

	pub, err := svc.Publish(context.Background(), p.ID)
	if err != nil {
		t.Fatal(err)
	}
	if pub.Status != StatusPublished || pub.PublishedAt == nil {
		t.Fatalf("published=%+v", pub)
	}
	got, err := svc.GetPublished(context.Background(), p.Slug)
	if err != nil || got.Title != "Acid en Chapinero" {
		t.Fatalf("get=%+v err=%v", got, err)
	}
	if _, err := svc.Publish(context.Background(), p.ID); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("republish=%v", err)
	}
}

func TestUniqueSlugAndCursor(t *testing.T) {
	svc := NewService(NewMemory(), nil)
	fixed := time.Date(2026, 9, 11, 18, 0, 0, 0, time.UTC)
	svc.Now = func() time.Time { return fixed }

	a, err := svc.Create(context.Background(), "a", CreateInput{Title: "Same", Body: "one"})
	if err != nil {
		t.Fatal(err)
	}
	b, err := svc.Create(context.Background(), "a", CreateInput{Title: "Same", Body: "two"})
	if err != nil {
		t.Fatal(err)
	}
	if a.Slug == b.Slug {
		t.Fatalf("slugs collided %s", a.Slug)
	}
	if _, err := svc.Create(context.Background(), "a", CreateInput{Slug: a.Slug, Title: "Other", Body: "x"}); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("dup slug=%v", err)
	}

	if _, err := svc.Publish(context.Background(), a.ID); err != nil {
		t.Fatal(err)
	}
	svc.Now = func() time.Time { return fixed.Add(time.Minute) }
	if _, err := svc.Publish(context.Background(), b.ID); err != nil {
		t.Fatal(err)
	}
	page, err := svc.ListPublished(context.Background(), ListFilter{Limit: 1})
	if err != nil || len(page) != 1 || page[0].ID != b.ID {
		t.Fatalf("page1=%+v err=%v", page, err)
	}
	cur := NextCursor(page, 1)
	if cur == nil {
		t.Fatal("expected cursor")
	}
	page2, err := svc.ListPublished(context.Background(), ListFilter{Cursor: *cur, Limit: 1})
	if err != nil || len(page2) != 1 || page2[0].ID != a.ID {
		t.Fatalf("page2=%+v err=%v", page2, err)
	}
}

func TestPatchSlugLockedWhenPublished(t *testing.T) {
	svc := NewService(NewMemory(), nil)
	p, err := svc.Create(context.Background(), "a", CreateInput{Title: "Lock me", Body: "body"})
	if err != nil {
		t.Fatal(err)
	}
	slug := "custom-slug"
	p, err = svc.Patch(context.Background(), p.ID, PatchInput{Slug: &slug})
	if err != nil || p.Slug != slug {
		t.Fatalf("patch slug=%+v err=%v", p, err)
	}
	if _, err := svc.Publish(context.Background(), p.ID); err != nil {
		t.Fatal(err)
	}
	other := "new-slug"
	if _, err := svc.Patch(context.Background(), p.ID, PatchInput{Slug: &other}); err == nil {
		t.Fatal("expected locked slug")
	}
}

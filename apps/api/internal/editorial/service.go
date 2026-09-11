package editorial

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/auth"
)

// Service is F23 editorial posts.
type Service struct {
	Store    Store
	Accounts Accounts
	Covers   Covers
	Now      func() time.Time
}

func NewService(store Store, accounts Accounts) *Service {
	return &Service{
		Store:    store,
		Accounts: accounts,
		Now:      func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *Service) Create(ctx context.Context, authorID string, in CreateInput) (Post, error) {
	title, err := normalizeTitle(in.Title)
	if err != nil {
		return Post{}, err
	}
	body, err := normalizeBody(in.Body, false)
	if err != nil {
		return Post{}, err
	}
	id, err := newID()
	if err != nil {
		return Post{}, err
	}
	slug, err := s.chooseSlug(ctx, in.Slug, title, id)
	if err != nil {
		return Post{}, err
	}
	now := s.now()
	p := Post{
		ID:       id,
		Slug:     slug,
		Title:    title,
		BodyMD:   body,
		Status:   StatusDraft,
		AuthorID: authorID,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.Store.Create(ctx, p); err != nil {
		if errors.Is(err, auth.ErrConflict) {
			return Post{}, auth.ErrConflict
		}
		return Post{}, err
	}
	return s.decorate(ctx, p), nil
}

func (s *Service) GetPublished(ctx context.Context, slug string) (Post, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" || !validSlug(slug) {
		return Post{}, auth.ErrNotFound
	}
	p, err := s.Store.BySlug(ctx, slug)
	if err != nil {
		return Post{}, err
	}
	if p.Status != StatusPublished {
		return Post{}, auth.ErrNotFound
	}
	return s.decorate(ctx, p), nil
}

func (s *Service) GetAdmin(ctx context.Context, id string) (Post, error) {
	id, err := parseID(id)
	if err != nil {
		return Post{}, err
	}
	p, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Post{}, err
	}
	return s.decorate(ctx, p), nil
}

func (s *Service) ListPublished(ctx context.Context, f ListFilter) ([]Post, error) {
	limit := f.Limit
	if limit < 1 {
		limit = 20
	}
	if limit > listMax {
		limit = listMax
	}
	ts, id, err := decodeCursor(f.Cursor)
	if err != nil {
		return nil, err
	}
	items, err := s.Store.ListPublished(ctx, ts, id, limit)
	if err != nil {
		return nil, err
	}
	out := make([]Post, 0, len(items))
	for _, p := range items {
		out = append(out, s.decorate(ctx, p))
	}
	return out, nil
}

func (s *Service) Patch(ctx context.Context, id string, in PatchInput) (Post, error) {
	id, err := parseID(id)
	if err != nil {
		return Post{}, err
	}
	p, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Post{}, err
	}
	if in.Title != nil {
		title, err := normalizeTitle(*in.Title)
		if err != nil {
			return Post{}, err
		}
		p.Title = title
	}
	if in.Body != nil {
		body, err := normalizeBody(*in.Body, p.Status == StatusPublished)
		if err != nil {
			return Post{}, err
		}
		p.BodyMD = body
	}
	if in.Slug != nil {
		if p.Status == StatusPublished {
			return Post{}, auth.Invalid{Fields: []auth.Field{{Name: "slug", Issue: "locked"}}}
		}
		slug := strings.ToLower(strings.TrimSpace(*in.Slug))
		if !validSlug(slug) {
			return Post{}, auth.Invalid{Fields: []auth.Field{{Name: "slug", Issue: "format"}}}
		}
		if slug != p.Slug {
			if _, err := s.Store.BySlug(ctx, slug); err == nil {
				return Post{}, auth.ErrConflict
			} else if !errors.Is(err, auth.ErrNotFound) {
				return Post{}, err
			}
			p.Slug = slug
		}
	}
	p.UpdatedAt = s.now()
	if err := s.Store.Update(ctx, p); err != nil {
		if errors.Is(err, auth.ErrConflict) {
			return Post{}, auth.ErrConflict
		}
		return Post{}, err
	}
	return s.decorate(ctx, p), nil
}

func (s *Service) Publish(ctx context.Context, id string) (Post, error) {
	id, err := parseID(id)
	if err != nil {
		return Post{}, err
	}
	p, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Post{}, err
	}
	if p.Status == StatusPublished {
		return Post{}, auth.ErrConflict
	}
	if _, err := normalizeTitle(p.Title); err != nil {
		return Post{}, err
	}
	body, err := normalizeBody(p.BodyMD, true)
	if err != nil {
		return Post{}, err
	}
	p.BodyMD = body
	now := s.now()
	p.Status = StatusPublished
	p.PublishedAt = &now
	p.UpdatedAt = now
	if err := s.Store.Update(ctx, p); err != nil {
		return Post{}, err
	}
	return s.decorate(ctx, p), nil
}

// BindCover is called by media.Service after confirming a cover object.
func (s *Service) BindCover(ctx context.Context, postID, assetID string) (string, error) {
	p, err := s.Store.ByID(ctx, postID)
	if err != nil {
		return "", err
	}
	prev := p.CoverAssetID
	p.CoverAssetID = assetID
	p.UpdatedAt = s.now()
	if err := s.Store.Update(ctx, p); err != nil {
		return "", err
	}
	return prev, nil
}

func (s *Service) decorate(ctx context.Context, p Post) Post {
	p.BodyHTML = RenderHTML(p.BodyMD)
	if p.CoverAssetID != "" && s.Covers != nil {
		if img, err := s.Covers.Image(ctx, p.CoverAssetID); err == nil {
			p.Cover = img
		}
	}
	return p
}

func (s *Service) chooseSlug(ctx context.Context, requested, title, id string) (string, error) {
	requested = strings.ToLower(strings.TrimSpace(requested))
	if requested != "" {
		if !validSlug(requested) {
			return "", auth.Invalid{Fields: []auth.Field{{Name: "slug", Issue: "format"}}}
		}
		return s.requireFreeSlug(ctx, requested)
	}
	base := postSlug(title, "")
	slug, err := s.requireFreeSlug(ctx, base)
	if err == nil {
		return slug, nil
	}
	if !errors.Is(err, auth.ErrConflict) {
		return "", err
	}
	return s.requireFreeSlug(ctx, postSlug(title, slugSuffix(id)))
}

func (s *Service) requireFreeSlug(ctx context.Context, slug string) (string, error) {
	_, err := s.Store.BySlug(ctx, slug)
	if errors.Is(err, auth.ErrNotFound) {
		return slug, nil
	}
	if err != nil {
		return "", err
	}
	return "", auth.ErrConflict
}

func normalizeTitle(title string) (string, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return "", auth.Invalid{Fields: []auth.Field{{Name: "title", Issue: "required"}}}
	}
	if utf8.RuneCountInString(title) > maxTitle {
		return "", auth.Invalid{Fields: []auth.Field{{Name: "title", Issue: "max"}}}
	}
	return title, nil
}

func normalizeBody(body string, required bool) (string, error) {
	body = strings.TrimSpace(body)
	if required && body == "" {
		return "", auth.Invalid{Fields: []auth.Field{{Name: "body_md", Issue: "required"}}}
	}
	if utf8.RuneCountInString(body) > maxBody {
		return "", auth.Invalid{Fields: []auth.Field{{Name: "body_md", Issue: "max"}}}
	}
	return body, nil
}

func parseID(id string) (string, error) {
	id = strings.TrimSpace(id)
	if _, err := uuid.Parse(id); err != nil {
		return "", auth.ErrNotFound
	}
	return id, nil
}

func newID() (string, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.NewString(), nil
	}
	return id.String(), nil
}

func NextCursor(items []Post, limit int) *string {
	if limit < 1 || len(items) < limit {
		return nil
	}
	last := items[len(items)-1]
	ts := last.CreatedAt
	if last.PublishedAt != nil {
		ts = *last.PublishedAt
	}
	c := encodeCursor(ts, last.ID)
	return &c
}

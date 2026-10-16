package editorial

import (
	"context"
	"time"

	"github.com/parche-app/backend/internal/events"
)

const (
	StatusDraft     = "draft"
	StatusPublished = "published"

	maxTitle   = 120
	maxBody    = 50000
	maxSlugLen = 80
	listMax    = 50
)

// Post is an editorial article (not the event agenda).
type Post struct {
	ID            string
	Slug          string
	Title         string
	BodyMD        string
	BodyHTML      string
	CoverAssetID  string
	Cover         *events.Image
	Status        string
	AuthorID      string
	PublishedAt   *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// CreateInput is POST /v1/admin/posts.
type CreateInput struct {
	Slug  string
	Title string
	Body  string
}

// PatchInput is PATCH /v1/admin/posts/{id}.
type PatchInput struct {
	Slug  *string
	Title *string
	Body  *string
}

// ListFilter is GET /v1/posts cursor pagination.
type ListFilter struct {
	Cursor string
	Limit  int
}

// Store persists posts.
type Store interface {
	Create(ctx context.Context, p Post) error
	ByID(ctx context.Context, id string) (Post, error)
	BySlug(ctx context.Context, slug string) (Post, error)
	Update(ctx context.Context, p Post) error
	ListPublished(ctx context.Context, after time.Time, afterID string, limit int) ([]Post, error)
}

// Accounts loads profiles for platform_admin (tests and extra checks).
type Accounts interface {
	Profiles(ctx context.Context, userID string) ([]string, error)
}

// Covers resolves F03 cover assets.
type Covers interface {
	Image(ctx context.Context, assetID string) (*events.Image, error)
}

package auth

import "errors"

// Sentinel errors. HTTP maps these to the product envelope; messages stay Spanish there.
var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrNotFound     = errors.New("not found")
	ErrGone         = errors.New("gone")
	ErrEmailTaken   = errors.New("email taken")
	ErrValidation   = errors.New("validation")
)

// Invalid is a user-input failure. Field/issue pairs become VALIDATION_ERROR details.
type Invalid struct {
	Fields []Field
}

// Field names a JSON body field and a stable machine issue.
type Field struct {
	Name  string
	Issue string
}

func (e Invalid) Error() string { return ErrValidation.Error() }

func (e Invalid) Unwrap() error { return ErrValidation }

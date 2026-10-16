package auth

import (
	"context"
	"errors"
	"net/url"
	"strings"

	"github.com/parche-app/backend/internal/mailer"
)

// PatchMe is PATCH /v1/me. Email must go through ChangeEmail.
func (s *Service) PatchMe(ctx context.Context, userID string, in PatchMeInput) (Me, error) {
	user, err := s.requireActive(ctx, userID)
	if err != nil {
		return Me{}, err
	}
	display := user.DisplayName
	bio := user.Bio
	phone := user.Phone
	var fields []Field
	if in.DisplayName != nil {
		display = normalizeDisplayName(*in.DisplayName)
		if display == "" || len([]rune(display)) > maxDisplayName {
			fields = append(fields, Field{Name: "display_name", Issue: "invalid"})
		}
	}
	if in.Bio != nil {
		bio = normalizeBio(*in.Bio)
		if bioTooLong(bio) {
			fields = append(fields, Field{Name: "bio", Issue: "length"})
		}
	}
	if in.Phone != nil {
		var ok bool
		phone, ok = normalizePhone(*in.Phone)
		if !ok {
			fields = append(fields, Field{Name: "phone", Issue: "invalid"})
		}
	}
	if len(fields) > 0 {
		return Me{}, Invalid{Fields: fields}
	}
	if err := s.Store.UpdateProfile(ctx, user.ID, display, bio, phone); err != nil {
		return Me{}, err
	}
	return s.Me(ctx, user.ID)
}

// ChangeEmail is POST /v1/me/email/change. Mail goes to the new address (F26 email_change).
func (s *Service) ChangeEmail(ctx context.Context, userID, email string) error {
	user, err := s.requireActive(ctx, userID)
	if err != nil {
		return err
	}
	email = normalizeEmail(email)
	if !validEmail(email) {
		return Invalid{Fields: []Field{{Name: "email", Issue: "invalid"}}}
	}
	if email == user.Email {
		return Invalid{Fields: []Field{{Name: "email", Issue: "unchanged"}}}
	}
	if _, err := s.Store.UserByEmail(ctx, email); err == nil {
		return ErrEmailTaken
	} else if !errors.Is(err, ErrNotFound) {
		return err
	}
	raw, err := NewRefresh()
	if err != nil {
		return err
	}
	hash := s.Tokens.hashRefresh(raw)
	id, err := newID()
	if err != nil {
		return err
	}
	now := s.now()
	if err := s.Store.InTx(ctx, func(st Store) error {
		if err := st.InvalidateUserEmailChanges(ctx, user.ID, now); err != nil {
			return err
		}
		return st.InsertEmailChange(ctx, EmailChangeRow{
			ID:        id,
			UserID:    user.ID,
			NewEmail:  email,
			TokenHash: hash,
			ExpiresAt: now.Add(EmailChangeTTL),
		})
	}); err != nil {
		return err
	}
	if s.Mailer == nil {
		return nil
	}
	origin := strings.TrimRight(s.AppOrigin, "/")
	if origin == "" {
		origin = "http://localhost:3000"
	}
	confirmURL := origin + "/email/confirm?token=" + url.QueryEscape(raw)
	if err := s.Mailer.Send(ctx, mailer.Message{
		To:             email,
		ToUserID:       user.ID,
		Template:       mailer.TemplateEmailChange,
		Vars:           map[string]string{"confirm_url": confirmURL},
		IdempotencyKey: id,
	}); err != nil {
		s.Log.Error("email_change_email", "user_id", user.ID, "err", err)
	}
	return nil
}

// ConfirmEmail is POST /v1/me/email/confirm. Token must belong to the caller.
func (s *Service) ConfirmEmail(ctx context.Context, userID, token string) error {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return err
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return Invalid{Fields: []Field{{Name: "token", Issue: "required"}}}
	}
	hash := s.Tokens.hashRefresh(token)
	now := s.now()
	return s.Store.InTx(ctx, func(st Store) error {
		row, err := st.EmailChangeByHash(ctx, hash)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				return ErrGone
			}
			return err
		}
		if row.UserID != userID {
			return ErrForbidden
		}
		if row.UsedAt != nil || !row.ExpiresAt.After(now) {
			return ErrGone
		}
		if _, err := st.UserByEmail(ctx, row.NewEmail); err == nil {
			return ErrEmailTaken
		} else if !errors.Is(err, ErrNotFound) {
			return err
		}
		if err := st.MarkEmailChangeUsed(ctx, row.ID, now); err != nil {
			return err
		}
		return st.SetEmail(ctx, userID, row.NewEmail)
	})
}

// BindAvatar is POST /v1/me/avatar after the object exists. media.Service calls this.
func (s *Service) BindAvatar(ctx context.Context, userID, assetID string) (string, error) {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return "", err
	}
	return s.Store.SetAvatarAsset(ctx, userID, assetID)
}

// PublicProfile is GET /v1/users/{id}. Disabled accounts look like missing ones.
func (s *Service) PublicProfile(ctx context.Context, userID string) (PublicProfile, error) {
	user, err := s.Store.UserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return PublicProfile{}, ErrNotFound
		}
		return PublicProfile{}, err
	}
	if user.Status != StatusActive {
		return PublicProfile{}, ErrNotFound
	}
	return PublicProfile{
		ID:            user.ID,
		DisplayName:   user.DisplayName,
		Bio:           user.Bio,
		Phone:         user.Phone,
		AvatarAssetID: user.AvatarAssetID,
	}, nil
}

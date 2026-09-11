package media

import (
	"context"
	"errors"
	"path"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
)

func audioView(a Asset) AudioView {
	return AudioView{
		ID:              a.ID,
		Kind:            a.Kind,
		MIME:            a.MIME,
		Bytes:           a.Bytes,
		DurationMS:      a.DurationMS,
		TranscodeStatus: a.TranscodeStatus,
	}
}

func (s *Service) ReplaceTracks(ctx context.Context, eventID string, in []TrackInput) ([]events.Track, error) {
	if len(in) > maxTracks {
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "tracks", Issue: "max"}}}
	}
	seenPos := map[int]struct{}{}
	seenAsset := map[string]struct{}{}
	rows := make([]Track, 0, len(in))
	for _, item := range in {
		title := strings.TrimSpace(item.Title)
		assetID := strings.TrimSpace(item.AssetID)
		if assetID == "" {
			return nil, auth.Invalid{Fields: []auth.Field{{Name: "asset_id", Issue: "required"}}}
		}
		if title == "" {
			return nil, auth.Invalid{Fields: []auth.Field{{Name: "title", Issue: "required"}}}
		}
		if utf8.RuneCountInString(title) > maxTrackTitle {
			return nil, auth.Invalid{Fields: []auth.Field{{Name: "title", Issue: "max"}}}
		}
		if item.Position < 0 {
			return nil, auth.Invalid{Fields: []auth.Field{{Name: "position", Issue: "min"}}}
		}
		if _, ok := seenPos[item.Position]; ok {
			return nil, auth.Invalid{Fields: []auth.Field{{Name: "position", Issue: "unique"}}}
		}
		if _, ok := seenAsset[assetID]; ok {
			return nil, auth.Invalid{Fields: []auth.Field{{Name: "asset_id", Issue: "unique"}}}
		}
		seenPos[item.Position] = struct{}{}
		seenAsset[assetID] = struct{}{}

		a, err := s.Store.AssetByID(ctx, assetID)
		if err != nil {
			if errors.Is(err, auth.ErrNotFound) {
				return nil, auth.ErrForbidden
			}
			return nil, err
		}
		if a.Kind != KindAudio {
			return nil, auth.Invalid{Fields: []auth.Field{{Name: "asset_id", Issue: "not_audio"}}}
		}
		if a.OwnerType != OwnerEvent || a.OwnerID != eventID {
			return nil, auth.ErrForbidden
		}
		id, err := newID()
		if err != nil {
			return nil, err
		}
		rows = append(rows, Track{
			ID:       id,
			EventID:  eventID,
			AssetID:  assetID,
			Title:    title,
			Position: item.Position,
		})
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].Position < rows[j].Position })
	if err := s.Store.ReplaceTracks(ctx, eventID, rows); err != nil {
		return nil, err
	}
	return s.eventTrackViews(ctx, eventID)
}

func (s *Service) EventTracks(ctx context.Context, eventIDs ...string) (map[string][]events.Track, error) {
	out := make(map[string][]events.Track, len(eventIDs))
	for _, id := range eventIDs {
		views, err := s.eventTrackViews(ctx, id)
		if err != nil {
			return nil, err
		}
		out[id] = views
	}
	return out, nil
}

func (s *Service) eventTrackViews(ctx context.Context, eventID string) ([]events.Track, error) {
	rows, err := s.Store.ListTracks(ctx, eventID)
	if err != nil {
		return nil, err
	}
	out := make([]events.Track, 0, len(rows))
	for _, tr := range rows {
		view := events.Track{
			ID:       tr.ID,
			Title:    tr.Title,
			Position: tr.Position,
		}
		a, err := s.Store.AssetByID(ctx, tr.AssetID)
		if err != nil {
			out = append(out, view)
			continue
		}
		if a.DurationMS > 0 {
			view.DurationMS = a.DurationMS
		}
		if a.TranscodeStatus == TranscodeReady && a.PreviewKey != "" && s.Objects != nil {
			url, err := s.Objects.GetPresign(ctx, a.PreviewKey, previewURLTTL)
			if err == nil && url != "" {
				view.PreviewURL = url
				exp := s.now().Add(previewURLTTL)
				view.PreviewExpiresAt = &exp
			}
		}
		out = append(out, view)
	}
	return out, nil
}

func (s *Service) MasterURL(ctx context.Context, eventID, trackID string) (MasterURL, error) {
	tr, err := s.Store.TrackByID(ctx, eventID, trackID)
	if err != nil {
		return MasterURL{}, err
	}
	a, err := s.Store.AssetByID(ctx, tr.AssetID)
	if err != nil {
		return MasterURL{}, err
	}
	if a.OwnerType != OwnerEvent || a.OwnerID != eventID || a.Kind != KindAudio {
		return MasterURL{}, auth.ErrNotFound
	}
	url, err := s.Objects.GetPresign(ctx, a.Key, masterURLTTL)
	if err != nil {
		return MasterURL{}, err
	}
	return MasterURL{URL: url, ExpiresAt: s.now().Add(masterURLTTL)}, nil
}

func previewKey(key string) string {
	ext := path.Ext(key)
	return strings.TrimSuffix(key, ext) + previewSuffix
}

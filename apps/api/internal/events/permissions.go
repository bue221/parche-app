package events

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/parche-app/backend/internal/auth"
)

const (
	PermWrite         = "event.write"
	PermPublish       = "event.publish"
	PermMembersManage = "event.members.manage"
	PermMetricsRead   = "event.metrics.read"
	PermDoorScan      = "event.door.scan"
	PermDoorLive      = "event.door.live"
	PermTicketsManage = "event.tickets.manage"

	aclKeyPref      = "event:"
	aclKeySuf       = ":acl"
	membersCacheSuf = ":members"
)

// PermissionsFor is the role → atomic permission pack. Handlers authorize these, not role strings.
func PermissionsFor(role string) []string {
	switch role {
	case RoleOwner:
		return []string{
			PermWrite, PermPublish, PermMembersManage, PermMetricsRead,
			PermDoorScan, PermDoorLive, PermTicketsManage,
		}
	case RoleManager:
		return []string{
			PermWrite, PermPublish, PermMembersManage, PermMetricsRead,
			PermDoorLive, PermTicketsManage,
		}
	case RoleDoor:
		return []string{PermDoorScan, PermDoorLive}
	case RoleMetrics:
		return []string{PermMetricsRead, PermDoorLive}
	default:
		return nil
	}
}

func roleHas(role, perm string) bool {
	for _, p := range PermissionsFor(role) {
		if p == perm {
			return true
		}
	}
	return false
}

// HasPermission is the F19/F20 gate: Redis ACL then Postgres. Missing or revoked membership is false.
func (s *Service) HasPermission(ctx context.Context, userID, eventID, perm string) (bool, error) {
	perms, err := s.cachedPerms(ctx, userID, eventID)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	return containsPerm(perms, perm), nil
}

func (s *Service) requirePerm(ctx context.Context, userID, id, perm string) (Event, error) {
	e, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Event{}, err
	}
	role, err := s.memberRole(ctx, id, userID)
	if err != nil {
		if e.Status == StatusPublished || e.Status == StatusCancelled {
			return Event{}, auth.ErrForbidden
		}
		return Event{}, auth.ErrNotFound
	}
	if !roleHas(role, perm) {
		return Event{}, auth.ErrForbidden
	}
	return e, nil
}

func (s *Service) cachedPerms(ctx context.Context, userID, eventID string) ([]string, error) {
	key := aclKey(eventID)
	if s.Cache != nil {
		raw, ok, err := s.Cache.HashGet(ctx, key, userID)
		if err == nil && ok {
			var perms []string
			if json.Unmarshal([]byte(raw), &perms) == nil {
				return perms, nil
			}
		}
	}
	m, err := s.Store.Member(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if m.Status != MemberActive {
		return nil, auth.ErrNotFound
	}
	perms := PermissionsFor(m.Role)
	if s.Cache != nil {
		body, _ := json.Marshal(perms)
		_ = s.Cache.HashSet(ctx, key, userID, string(body), aclCacheTTL)
	}
	return perms, nil
}

func (s *Service) invalidateACL(ctx context.Context, eventID string) {
	if s.Cache == nil {
		return
	}
	_ = s.Cache.Delete(ctx, aclKey(eventID), membersCacheKey(eventID))
}

func aclKey(eventID string) string {
	return aclKeyPref + eventID + aclKeySuf
}

func membersCacheKey(eventID string) string {
	return aclKeyPref + eventID + membersCacheSuf
}

func containsPerm(perms []string, want string) bool {
	for _, p := range perms {
		if p == want {
			return true
		}
	}
	return false
}

func inviteableRole(role string) bool {
	switch strings.TrimSpace(role) {
	case RoleManager, RoleDoor, RoleMetrics:
		return true
	default:
		return false
	}
}

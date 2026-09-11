package recs

import (
	"sort"
	"strings"
)

type profile struct {
	followed map[string]struct{}
	genres   map[string]struct{}
	paid     map[string]struct{}
	lat      float64
	lng      float64
	hasLoc   bool
	cold     bool
}

func buildProfile(cands []Candidate, followed, paid []string) profile {
	p := profile{
		followed: setOf(followed),
		genres:   map[string]struct{}{},
		paid:     setOf(paid),
	}
	paidSet := p.paid
	followSet := p.followed
	var latSum, lngSum float64
	var locN int
	for _, c := range cands {
		fromFollow := false
		for _, a := range c.Artists {
			if _, ok := followSet[a]; ok {
				fromFollow = true
				break
			}
		}
		_, bought := paidSet[c.Event.ID]
		if !bought && !fromFollow {
			continue
		}
		for _, g := range c.Genres {
			g = strings.ToLower(strings.TrimSpace(g))
			if g != "" {
				p.genres[g] = struct{}{}
			}
		}
		latSum += c.Lat
		lngSum += c.Lng
		locN++
	}
	if locN > 0 {
		p.lat = latSum / float64(locN)
		p.lng = lngSum / float64(locN)
		p.hasLoc = true
	}
	p.cold = len(p.followed) == 0 && len(p.genres) == 0
	return p
}

func rank(cands []Candidate, p profile, excludeID string, limit int) []Item {
	if limit < 1 {
		limit = maxReturn
	}
	type scored struct {
		id     string
		reason string
		score  int
		sold   int
		start  int64
	}
	var rows []scored
	for _, c := range cands {
		id := c.Event.ID
		if id == "" || id == excludeID {
			continue
		}
		if _, bought := p.paid[id]; bought {
			continue
		}
		follow := 0
		for _, a := range c.Artists {
			if _, ok := p.followed[a]; ok {
				follow = 1
				break
			}
		}
		overlap := 0
		for _, g := range c.Genres {
			g = strings.ToLower(strings.TrimSpace(g))
			if _, ok := p.genres[g]; ok {
				overlap++
			}
		}
		city := 0
		if p.hasLoc && inCity(p.lat, p.lng, c.Lat, c.Lng) {
			city = 1
		}
		score := followWeight*follow + genreWeight*overlap + cityWeight*city
		reason := ReasonPopular
		if follow == 1 {
			reason = ReasonFollow
		} else if overlap > 0 {
			reason = ReasonGenre
		}
		if p.cold {
			score = c.Sold7d
			reason = ReasonPopular
		}
		rows = append(rows, scored{id: id, reason: reason, score: score, sold: c.Sold7d, start: c.StartsAt.UnixNano()})
	}
	sort.SliceStable(rows, func(i, j int) bool {
		if rows[i].score != rows[j].score {
			return rows[i].score > rows[j].score
		}
		if rows[i].sold != rows[j].sold {
			return rows[i].sold > rows[j].sold
		}
		if rows[i].start != rows[j].start {
			return rows[i].start < rows[j].start
		}
		return rows[i].id < rows[j].id
	})
	if len(rows) > limit {
		rows = rows[:limit]
	}
	out := make([]Item, 0, len(rows))
	for _, r := range rows {
		out = append(out, Item{EventID: r.id, Reason: r.reason, Score: r.score})
	}
	return out
}

func inCity(ulat, ulng, lat, lng float64) bool {
	dlat := ulat - lat
	if dlat < 0 {
		dlat = -dlat
	}
	dlng := ulng - lng
	if dlng < 0 {
		dlng = -dlng
	}
	return dlat <= citySpanDeg && dlng <= citySpanDeg
}

func setOf(ids []string) map[string]struct{} {
	out := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		if id != "" {
			out[id] = struct{}{}
		}
	}
	return out
}

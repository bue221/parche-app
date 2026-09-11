package postgres

import (
	"strings"
	"testing"
)

func TestSplitSQLSkipsComments(t *testing.T) {
	got := SplitSQL(`
-- header
CREATE TABLE users (id UUID PRIMARY KEY);
CREATE INDEX users_email ON users (email);
`)
	if len(got) != 2 {
		t.Fatalf("got %#v", got)
	}
	if !strings.Contains(got[0], "CREATE TABLE users") {
		t.Fatalf("stmt0=%s", got[0])
	}
}

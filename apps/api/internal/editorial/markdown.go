package editorial

import (
	"html"
	"net/url"
	"strings"
	"unicode"
)

// RenderHTML turns markdown into allowlisted HTML. Raw tags are escaped; javascript: links are dropped.
func RenderHTML(md string) string {
	md = strings.ReplaceAll(md, "\r\n", "\n")
	md = strings.TrimSpace(md)
	if md == "" {
		return ""
	}

	var b strings.Builder
	lines := strings.Split(md, "\n")
	i := 0
	for i < len(lines) {
		line := lines[i]
		trim := strings.TrimSpace(line)
		if trim == "" {
			i++
			continue
		}
		if strings.HasPrefix(trim, "```") {
			var code []string
			i++
			for i < len(lines) && !strings.HasPrefix(strings.TrimSpace(lines[i]), "```") {
				code = append(code, lines[i])
				i++
			}
			if i < len(lines) {
				i++
			}
			b.WriteString("<pre><code>")
			b.WriteString(html.EscapeString(strings.Join(code, "\n")))
			b.WriteString("</code></pre>")
			continue
		}
		if heading, ok := headingHTML(trim); ok {
			b.WriteString(heading)
			i++
			continue
		}
		if strings.HasPrefix(trim, ">") {
			var quote []string
			for i < len(lines) {
				t := strings.TrimSpace(lines[i])
				if !strings.HasPrefix(t, ">") {
					break
				}
				quote = append(quote, strings.TrimSpace(strings.TrimPrefix(t, ">")))
				i++
			}
			b.WriteString("<blockquote>")
			b.WriteString(inline(strings.Join(quote, " ")))
			b.WriteString("</blockquote>")
			continue
		}
		if isUL(trim) {
			b.WriteString("<ul>")
			for i < len(lines) && isUL(strings.TrimSpace(lines[i])) {
				item := strings.TrimSpace(lines[i])
				item = strings.TrimSpace(item[1:])
				b.WriteString("<li>")
				b.WriteString(inline(item))
				b.WriteString("</li>")
				i++
			}
			b.WriteString("</ul>")
			continue
		}
		if isOL(trim) {
			b.WriteString("<ol>")
			for i < len(lines) && isOL(strings.TrimSpace(lines[i])) {
				item := strings.TrimSpace(lines[i])
				_, rest, _ := strings.Cut(item, ".")
				b.WriteString("<li>")
				b.WriteString(inline(strings.TrimSpace(rest)))
				b.WriteString("</li>")
				i++
			}
			b.WriteString("</ol>")
			continue
		}
		var para []string
		for i < len(lines) {
			t := strings.TrimSpace(lines[i])
			if t == "" || strings.HasPrefix(t, "```") || strings.HasPrefix(t, ">") || isUL(t) || isOL(t) {
				break
			}
			if _, ok := headingHTML(t); ok {
				break
			}
			para = append(para, t)
			i++
		}
		b.WriteString("<p>")
		b.WriteString(inline(strings.Join(para, " ")))
		b.WriteString("</p>")
	}
	return b.String()
}

func headingHTML(line string) (string, bool) {
	n := 0
	for n < len(line) && line[n] == '#' {
		n++
	}
	if n == 0 || n > 3 {
		return "", false
	}
	if n == len(line) || (line[n] != ' ' && line[n] != '\t') {
		return "", false
	}
	text := strings.TrimSpace(line[n:])
	tag := []string{"h1", "h2", "h3"}[n-1]
	return "<" + tag + ">" + inline(text) + "</" + tag + ">", true
}

func isUL(line string) bool {
	return strings.HasPrefix(line, "- ") || strings.HasPrefix(line, "* ")
}

func isOL(line string) bool {
	i := 0
	for i < len(line) && unicode.IsDigit(rune(line[i])) {
		i++
	}
	return i > 0 && i+1 < len(line) && line[i] == '.' && line[i+1] == ' '
}

func inline(s string) string {
	var b strings.Builder
	i := 0
	runes := []rune(s)
	for i < len(runes) {
		if runes[i] == '`' {
			j := i + 1
			for j < len(runes) && runes[j] != '`' {
				j++
			}
			if j < len(runes) {
				b.WriteString("<code>")
				b.WriteString(html.EscapeString(string(runes[i+1 : j])))
				b.WriteString("</code>")
				i = j + 1
				continue
			}
		}
		if runes[i] == '[' {
			if text, href, n, ok := parseLink(runes[i:]); ok {
				b.WriteString(`<a href="` + html.EscapeString(href) + `">`)
				b.WriteString(html.EscapeString(text))
				b.WriteString("</a>")
				i += n
				continue
			}
		}
		if i+1 < len(runes) && runes[i] == '*' && runes[i+1] == '*' {
			if inner, n, ok := delimited(runes[i+2:], []rune("**")); ok {
				b.WriteString("<strong>")
				b.WriteString(inline(inner))
				b.WriteString("</strong>")
				i += 2 + n + 2
				continue
			}
		}
		if runes[i] == '*' {
			if inner, n, ok := delimited(runes[i+1:], []rune{'*'}); ok {
				b.WriteString("<em>")
				b.WriteString(inline(inner))
				b.WriteString("</em>")
				i += 1 + n + 1
				continue
			}
		}
		b.WriteString(html.EscapeString(string(runes[i])))
		i++
	}
	return b.String()
}

func delimited(rest []rune, close []rune) (string, int, bool) {
	for i := 0; i+len(close) <= len(rest); i++ {
		match := true
		for j := range close {
			if rest[i+j] != close[j] {
				match = false
				break
			}
		}
		if match && i > 0 {
			return string(rest[:i]), i, true
		}
	}
	return "", 0, false
}

func parseLink(runes []rune) (text, href string, n int, ok bool) {
	if len(runes) == 0 || runes[0] != '[' {
		return "", "", 0, false
	}
	endText := -1
	for i := 1; i < len(runes); i++ {
		if runes[i] == ']' {
			endText = i
			break
		}
	}
	if endText < 0 || endText+1 >= len(runes) || runes[endText+1] != '(' {
		return "", "", 0, false
	}
	endURL := -1
	for i := endText + 2; i < len(runes); i++ {
		if runes[i] == ')' {
			endURL = i
			break
		}
	}
	if endURL < 0 {
		return "", "", 0, false
	}
	text = string(runes[1:endText])
	raw := strings.TrimSpace(string(runes[endText+2 : endURL]))
	if !safeHref(raw) {
		return "", "", 0, false
	}
	return text, raw, endURL + 1, true
}

func safeHref(raw string) bool {
	u, err := url.Parse(raw)
	if err != nil || u.Opaque != "" {
		return false
	}
	switch strings.ToLower(u.Scheme) {
	case "http", "https":
		return u.Host != ""
	default:
		return false
	}
}

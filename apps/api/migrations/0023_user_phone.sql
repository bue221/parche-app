-- Contact phone on attendee/promoter/artist accounts.
ALTER TABLE users
	ADD COLUMN phone TEXT NOT NULL DEFAULT '';

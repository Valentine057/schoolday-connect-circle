# School Platform Roadmap

Single school, African context. Currency, grading scale and term dates are configurable in Admin Settings. Payments: Paystack/Flutterwave (Phase 5). Built to scale toward 1M+ students: all list/data access goes through indexed database queries with pagination from day one.

## Phase 1 — Foundation (IN PROGRESS)
- [x] Project roadmap
- [x] Enable Lovable Cloud (database + auth + storage)
- [ ] Design system (school brand, tokens, fonts)
- [ ] Database: profiles, user_roles, has_role(), school settings, classes, students
- [ ] Public landing page (school identity, sign-in CTA)
- [ ] Student registration (student details -> account -> profile)
- [ ] Login & authentication (email/password, session-aware sign-in affordance)
- [ ] Password reset page (/reset-password)
- [ ] Student dashboard skeleton (profile card, placeholder module tiles)

## Phase 2 — Academic core
- [ ] Courses & classes (admin creates classes, assigns subjects/teachers)
- [ ] Enrollments (student -> class per session/term)
- [ ] Timetable view on student dashboard
- [ ] Staff portal skeleton (role-gated: teacher/admin)
- [ ] Admin portal (manage students, classes, sessions, terms)

## Phase 3 — Learning records
- [ ] Assignments (create, submit, grade)
- [ ] Attendance (daily/period registers, student + parent views)
- [ ] Library (catalogue, borrow/return records)

## Phase 4 — Assessment
- [ ] Exams & CBT engine (question banks, timed sessions, auto-scoring)
- [ ] Results portal (termly CA + exam scores, grading per configured scale)
- [ ] Report card generation

## Phase 5 — Money & messaging
- [ ] Paystack/Flutterwave fee payment (webhook-verified, receipt records)
- [ ] Fee structure per class/term, payment history
- [ ] Notifications (in-app + email; fee reminders, results published, announcements)
- [ ] Parent portal (linked students, results, fees, attendance)

## Phase 6 — Scale & polish
- [ ] Performance pass (indexes, pagination everywhere, caching)
- [ ] Bulk import/export (CSV students, results)
- [ ] Audit logs, backups, security review

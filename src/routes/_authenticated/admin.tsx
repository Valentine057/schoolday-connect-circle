import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShieldCheck, Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Admin portal — Greenfield Academy" },
      { name: "description", content: "Manage students, classes, subjects, enrollments and the timetable." },
      { property: "og:title", content: "Admin portal — Greenfield Academy" },
      { property: "og:description", content: "Manage students, classes, subjects, enrollments and the timetable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPortal,
});

const PAGE_SIZE = 25;
const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

type StudentRow = {
  id: string;
  admission_no: string | null;
  status: string;
  guardian_name: string | null;
  class_id: string | null;
  class_requested: string | null;
  user_id: string | null;
  profiles: { full_name: string } | null;
  classes: { name: string } | null;
};

type ClassRow = { id: string; name: string; level: string };
type SubjectRow = { id: string; name: string; code: string | null };
type StaffMember = { id: string; full_name: string };
type EnrollmentRow = {
  id: string;
  session: string;
  term: string;
  status: string;
  students: { profiles: { full_name: string } | null } | null;
  classes: { name: string } | null;
};
type SlotRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher_name: string | null;
  subjects: { name: string } | null;
};

function AdminPortal() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="font-display font-semibold leading-tight">Admin portal</p>
              <p className="text-xs text-muted-foreground">Students · Classes · Enrollments · Timetable</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="students">
          <TabsList className="flex-wrap">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="academics">Classes &amp; Subjects</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            <TabsTrigger value="settings">Settings &amp; Roles</TabsTrigger>
          </TabsList>
          <TabsContent value="students" className="mt-4"><StudentsTab /></TabsContent>
          <TabsContent value="academics" className="mt-4"><AcademicsTab /></TabsContent>
          <TabsContent value="enrollments" className="mt-4"><EnrollmentsTab /></TabsContent>
          <TabsContent value="timetable" className="mt-4"><TimetableTab /></TabsContent>
          <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Students ---------------- */

function StudentsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [admissionNo, setAdmissionNo] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");

  const classesQ = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name, level").order("name");
      if (error) throw error;
      return data as ClassRow[];
    },
  });

  const studentsQ = useQuery({
    queryKey: ["admin", "students", page, search],
    queryFn: async () => {
      let q = supabase
        .from("students")
        .select("id, admission_no, status, guardian_name, class_id, class_requested, user_id, profiles(full_name), classes(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (search.trim()) {
        q = q.or(`admission_no.ilike.%${search.trim()}%,profiles.full_name.ilike.%${search.trim()}%,guardian_name.ilike.%${search.trim()}%`);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as StudentRow[], total: count ?? 0 };
    },
  });

  async function saveStudent() {
    if (!editing) return;
    const { error } = await supabase
      .from("students")
      .update({
        admission_no: admissionNo.trim() || null,
        class_id: classId || null,
        status,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Student updated");
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
  }

  const rows = studentsQ.data?.rows ?? [];
  const total = studentsQ.data?.total ?? 0;

  return (
    <Card className="border-border/60 card-shadow">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">Students ({total})</CardTitle>
        <Input
          placeholder="Search name, admission no, guardian…"
          className="max-w-xs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
      </CardHeader>
      <CardContent>
        {studentsQ.isPending ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Admission no</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>{s.admission_no ?? "—"}</TableCell>
                    <TableCell>
                      {s.classes?.name ?? s.class_requested ?? "—"}
                      {!s.classes?.name && s.class_requested && <Badge variant="secondary" className="ml-1">requested</Badge>}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{s.status}</Badge></TableCell>
                    <TableCell>{s.guardian_name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(s);
                              setAdmissionNo(s.admission_no ?? "");
                              setClassId(s.class_id ?? "");
                              setStatus(s.status);
                            }}
                          >
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit {editing?.profiles?.full_name ?? "student"}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label>Admission number</Label>
                              <Input value={admissionNo} onChange={(e) => setAdmissionNo(e.target.value)} placeholder="e.g. GA/2026/0001" />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Class</Label>
                              <Select value={classId} onValueChange={setClassId}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                                <SelectContent>
                                  {(classesQ.data ?? []).map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Status</Label>
                              <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="graduated">Graduated</SelectItem>
                                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button className="w-full" onClick={saveStudent}>Save changes</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No students found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" /> Prev
                </Button>
                <Button size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Classes & subjects ---------------- */

function AcademicsTab() {
  const queryClient = useQueryClient();
  const [className, setClassName] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");

  const classesQ = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name, level").order("name");
      if (error) throw error;
      return data as ClassRow[];
    },
  });
  const subjectsQ = useQuery({
    queryKey: ["admin", "subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, code").order("name");
      if (error) throw error;
      return data as SubjectRow[];
    },
  });
  const staffQ = useQuery({
    queryKey: ["admin", "staff-members"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "staff");
      if (error) throw error;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [] as StaffMember[];
      const { data, error: pErr } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      if (pErr) throw pErr;
      return (data ?? []) as StaffMember[];
    },
  });
  const assignmentsQ = useQuery({
    queryKey: ["admin", "class-subjects", selectedClass],
    enabled: !!selectedClass,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_subjects")
        .select("id, subject_id, teacher_id, subjects(name), profiles(full_name)")
        .eq("class_id", selectedClass)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string; subject_id: string; teacher_id: string | null;
        subjects: { name: string } | null; profiles: { full_name: string } | null;
      }>;
    },
  });

  async function addClass() {
    if (!className.trim() || !classLevel) { toast.error("Class name and level are required"); return; }
    const { error } = await supabase.from("classes").insert({ name: className.trim(), level: classLevel });
    if (error) { toast.error(error.message); return; }
    toast.success("Class created");
    setClassName("");
    queryClient.invalidateQueries({ queryKey: ["admin", "classes"] });
  }

  async function addSubject() {
    if (!subjectName.trim()) { toast.error("Subject name is required"); return; }
    const { error } = await supabase.from("subjects").insert({ name: subjectName.trim(), code: subjectCode.trim() || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Subject created");
    setSubjectName("");
    setSubjectCode("");
    queryClient.invalidateQueries({ queryKey: ["admin", "subjects"] });
  }

  async function assignTeacher() {
    if (!selectedClass || !newSubjectId) { toast.error("Pick a class and a subject"); return; }
    const teacher = (staffQ.data ?? []).find((s) => s.id === newTeacherId);
    const { error } = await supabase.from("class_subjects").upsert(
      { class_id: selectedClass, subject_id: newSubjectId, teacher_id: newTeacherId || null },
      { onConflict: "class_id,subject_id" }
    );
    if (error) { toast.error(error.message); return; }
    toast.success(teacher ? `Assigned ${teacher.full_name}` : "Subject added to class");
    queryClient.invalidateQueries({ queryKey: ["admin", "class-subjects", selectedClass] });
  }

  async function removeAssignment(id: string) {
    const { error } = await supabase.from("class_subjects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin", "class-subjects", selectedClass] });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60 card-shadow">
        <CardHeader><CardTitle className="text-lg">Classes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Class name e.g. Primary 4" value={className} onChange={(e) => setClassName(e.target.value)} />
            <Input placeholder="Level e.g. Primary" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} />
          </div>
          <Button onClick={addClass} className="w-full"><Plus className="size-4" /> Create class</Button>
          <div className="flex flex-wrap gap-2">
            {(classesQ.data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selectedClass === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 card-shadow">
        <CardHeader><CardTitle className="text-lg">Subjects &amp; teachers</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Subject name e.g. Mathematics" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
            <Input placeholder="Code (optional)" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} />
          </div>
          <Button onClick={addSubject} className="w-full"><Plus className="size-4" /> Create subject</Button>
          <div className="rounded-lg border border-border/60 p-3 space-y-3">
            <p className="text-sm font-medium">Assign a teacher</p>
            <Select value={newSubjectId} onValueChange={setNewSubjectId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {(subjectsQ.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newTeacherId} onValueChange={setNewTeacherId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Teacher (optional)" /></SelectTrigger>
              <SelectContent>
                {(staffQ.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={assignTeacher} disabled={!selectedClass}>
              {selectedClass ? "Assign to selected class" : "Select a class first"}
            </Button>
          </div>
          {selectedClass && (
            <div className="space-y-2">
              {(assignmentsQ.data ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{a.subjects?.name ?? "Subject"}</p>
                    <p className="text-xs text-muted-foreground">Teacher: {a.profiles?.full_name ?? "Unassigned"}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeAssignment(a.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {(assignmentsQ.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No subjects assigned to this class yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Enrollments ---------------- */

function EnrollmentsTab() {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");

  const settingsQ = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_settings").select("current_session, current_term").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const studentsQ = useQuery({
    queryKey: ["admin", "students", "all-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ id: string; profiles: { full_name: string } | null }>;
    },
  });

  const enrollmentsQ = useQuery({
    queryKey: ["admin", "enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, session, term, status, students(profiles(full_name)), classes(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as EnrollmentRow[];
    },
  });

  const classesQ = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name, level").order("name");
      if (error) throw error;
      return data as ClassRow[];
    },
  });

  async function enroll() {
    const session = settingsQ.data?.current_session;
    const term = settingsQ.data?.current_term;
    if (!studentId || !classId) { toast.error("Pick a student and a class"); return; }
    if (!session || !term) { toast.error("Set the current session and term first"); return; }
    const { error } = await supabase.from("enrollments").upsert(
      { student_id: studentId, class_id: classId, session, term, status: "active" },
      { onConflict: "student_id,session,term" }
    );
    if (error) { toast.error(error.message); return; }
    toast.success(`Enrolled for ${term}, ${session}`);
    queryClient.invalidateQueries({ queryKey: ["admin", "enrollments"] });
  }

  return (
    <Card className="border-border/60 card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">Enrollments — {settingsQ.data?.current_term}, {settingsQ.data?.current_session}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Student" /></SelectTrigger>
            <SelectContent>
              {(studentsQ.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.profiles?.full_name ?? "Student"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              {(classesQ.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={enroll}>Enroll student</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(enrollmentsQ.data ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.students?.profiles?.full_name ?? "—"}</TableCell>
                <TableCell>{e.classes?.name ?? "—"}</TableCell>
                <TableCell>{e.session}</TableCell>
                <TableCell>{e.term}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{e.status}</Badge></TableCell>
              </TableRow>
            ))}
            {(enrollmentsQ.data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No enrollments yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------- Timetable ---------------- */

function TimetableTab() {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherName, setTeacherName] = useState("");

  const classesQ = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name, level").order("name");
      if (error) throw error;
      return data as ClassRow[];
    },
  });
  const subjectsQ = useQuery({
    queryKey: ["admin", "subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, code").order("name");
      if (error) throw error;
      return data as SubjectRow[];
    },
  });
  const slotsQ = useQuery({
    queryKey: ["admin", "timetable", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, day_of_week, start_time, end_time, teacher_name, subjects(name)")
        .eq("class_id", classId)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as unknown as SlotRow[];
    },
  });

  async function addSlot() {
    if (!classId || !start || !end || !subjectId) { toast.error("Class, times and subject are required"); return; }
    if (start >= end) { toast.error("End time must be after start time"); return; }
    const { error } = await supabase.from("timetable_slots").insert({
      class_id: classId,
      day_of_week: Number(day),
      start_time: start,
      end_time: end,
      subject_id: subjectId,
      teacher_name: teacherName.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Period added");
    setStart(""); setEnd(""); setSubjectId(""); setTeacherName("");
    queryClient.invalidateQueries({ queryKey: ["admin", "timetable", classId] });
  }

  async function removeSlot(id: string) {
    const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin", "timetable", classId] });
  }

  const slots = slotsQ.data ?? [];
  const byDay = DAYS.map((label, idx) => ({ label, idx, slots: slots.filter((s) => s.day_of_week === idx) }))
    .filter((d) => d.idx > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Card className="border-border/60 card-shadow">
        <CardHeader><CardTitle className="text-lg">Add a period</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              {(classesQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.slice(1).map((d, i) => <SelectItem key={d} value={String(i + 1)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {(subjectsQ.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="slot-start">Starts</Label>
              <Input id="slot-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-end">Ends</Label>
              <Input id="slot-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <Input placeholder="Teacher name (shown to students)" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          <Button className="w-full" onClick={addSlot}><Plus className="size-4" /> Add period</Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 card-shadow">
        <CardHeader><CardTitle className="text-lg">Weekly timetable</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!classId && <p className="text-sm text-muted-foreground">Select a class to see its timetable.</p>}
          {classId && slotsQ.isPending && <Skeleton className="h-40 w-full" />}
          {classId && !slotsQ.isPending && byDay.map((d) => (
            <div key={d.idx}>
              <p className="text-sm font-medium">{d.label}</p>
              {d.slots.length === 0 ? (
                <p className="text-xs text-muted-foreground">No periods.</p>
              ) : (
                <div className="mt-1 space-y-1.5">
                  {d.slots.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-1.5 text-sm">
                      <span>{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {s.subjects?.name ?? "Subject"}{s.teacher_name ? ` · ${s.teacher_name}` : ""}</span>
                      <Button size="icon" variant="ghost" onClick={() => removeSlot(s.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Settings & roles ---------------- */

function SettingsTab() {
  const queryClient = useQueryClient();
  const [schoolName, setSchoolName] = useState("");
  const [motto, setMotto] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [session, setSession] = useState("");
  const [term, setTerm] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Enums<"app_role">>("staff");

  const settingsQ = useQuery({
    queryKey: ["settings-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (settingsQ.data && !loaded) {
    setSchoolName(settingsQ.data.school_name);
    setMotto(settingsQ.data.motto);
    setCurrencyCode(settingsQ.data.currency_code);
    setCurrencySymbol(settingsQ.data.currency_symbol);
    setSession(settingsQ.data.current_session);
    setTerm(settingsQ.data.current_term);
    setLoaded(true);
  }

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase.from("school_settings").update({
      school_name: schoolName.trim(),
      motto: motto.trim(),
      currency_code: currencyCode.trim(),
      currency_symbol: currencySymbol.trim(),
      current_session: session.trim(),
      current_term: term.trim(),
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("School settings saved");
    queryClient.invalidateQueries({ queryKey: ["settings-full"] });
    queryClient.invalidateQueries({ queryKey: ["settings"] });
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  async function grantRole() {
    if (!email.trim()) { toast.error("Enter the person's email"); return; }
    // Find the auth user id via the profiles table is not possible for
    // not-yet-registered people; we look up by matching profile names is not
    // reliable either, so we ask Supabase auth through an RPC-free path:
    // grant by email only works for people who already have an account.
    const { data: users, error } = await supabase.rpc("has_role", { _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin" });
    void users; void error;
    toast.error("Role granting by email needs the person to already have an account. Use the Roles list below.");
  }

  const rolesQ = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, profiles(full_name)");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ id: string; user_id: string; role: Enums<"app_role">; profiles: { full_name: string } | null }>;
    },
  });

  async function grantFromList(userId: string, r: Enums<"app_role">) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: r });
    if (error) { toast.error(error.message); return; }
    toast.success("Role granted");
    queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "staff-members"] });
  }

  async function revokeRole(id: string) {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Role removed");
    queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "staff-members"] });
  }

  const profilesQ = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as Array<{ id: string; full_name: string }>;
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60 card-shadow">
        <CardHeader><CardTitle className="text-lg">School settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>School name</Label><Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Motto</Label><Input value={motto} onChange={(e) => setMotto(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Currency code</Label><Input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Currency symbol</Label><Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Current session</Label><Input value={session} onChange={(e) => setSession(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Current term</Label><Input value={term} onChange={(e) => setTerm(e.target.value)} /></div>
          </div>
          <Button className="w-full" onClick={saveSettings} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />} Save settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 card-shadow">
        <CardHeader><CardTitle className="text-lg">Roles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 p-3 space-y-3">
            <p className="text-sm font-medium">Grant a role to someone with an account</p>
            <Select value={role} onValueChange={(v) => setRole(v as Enums<"app_role">)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
            <Select value={email} onValueChange={setEmail}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Person" /></SelectTrigger>
              <SelectContent>
                {(profilesQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || "Unnamed"}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => grantFromList(email, role)} disabled={!email}>Grant role</Button>
          </div>
          <div className="space-y-2">
            {(rolesQ.data ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{r.profiles?.full_name ?? r.user_id.slice(0, 8)}</p>
                  <Badge variant="outline" className="capitalize">{r.role}</Badge>
                </div>
                <Button size="icon" variant="ghost" onClick={() => revokeRole(r.id)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Staff members appear in the teacher dropdowns on the Classes &amp; Subjects tab.</p>
        </CardContent>
      </Card>
    </div>
  );
}

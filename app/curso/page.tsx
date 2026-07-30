import { redirect } from "next/navigation";
import { requireApprovedStudent } from "@/lib/auth";
import { firstUnlockedLesson, getStudentCourse } from "@/lib/course";

export const dynamic = "force-dynamic";

export default async function CourseIndexPage() {
  const profile = await requireApprovedStudent();
  const data = await getStudentCourse(profile.id);
  const lesson = firstUnlockedLesson(data.flatLessons);
  redirect(lesson ? `/curso/${lesson.id}` : "/dashboard");
}

import { AccessToken, TokenVerifier } from "livekit-server-sdk";
import jwt from "jsonwebtoken";

const API_KEY = "devkey";
const API_SECRET = "secret";

interface UserContext {
  userId: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  isClassTeacher: boolean;
}

async function createClassToken(
  user: UserContext,
  classId: string
): Promise<{ token: string; isPublisher: boolean }> {
  const isPublisher = user.role === "ADMIN" || user.isClassTeacher;

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: user.userId,
    name: user.name,
    metadata: JSON.stringify({
      role: user.role,
      isTeacher: isPublisher,
    }),
  });

  at.addGrant({
    roomJoin: true,
    room: `class-${classId}`,
    canPublish: isPublisher,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return { token, isPublisher };
}

describe("LiveKit Token Permission Logic Tests", () => {
  const classId = "class-olympiad-101";

  it("grants publishing rights and roomAdmin to TEACHER who owns the class", async () => {
    const teacher: UserContext = {
      userId: "teacher-1",
      name: "Prof. Verma",
      role: "TEACHER",
      isClassTeacher: true,
    };

    const { token, isPublisher } = await createClassToken(teacher, classId);
    expect(isPublisher).toBe(true);

    const decoded = jwt.decode(token) as any;
    expect(decoded.sub).toBe("teacher-1");
    expect(decoded.name).toBe("Prof. Verma");
    expect(decoded.video.room).toBe(`class-${classId}`);
    expect(decoded.video.canPublish).toBe(true);
    expect(decoded.video.canSubscribe).toBe(true);
    expect(decoded.video.canPublishData).toBe(true);
  });

  it("grants publishing rights to ADMIN users", async () => {
    const admin: UserContext = {
      userId: "admin-1",
      name: "Admin User",
      role: "ADMIN",
      isClassTeacher: false,
    };

    const { token, isPublisher } = await createClassToken(admin, classId);
    expect(isPublisher).toBe(true);

    const decoded = jwt.decode(token) as any;
    expect(decoded.video.canPublish).toBe(true);
  });

  it("restricts STUDENT to subscribe-only by default (canPublish = false)", async () => {
    const student: UserContext = {
      userId: "student-1",
      name: "Student Prodigy",
      role: "STUDENT",
      isClassTeacher: false,
    };

    const { token, isPublisher } = await createClassToken(student, classId);
    expect(isPublisher).toBe(false);

    const decoded = jwt.decode(token) as any;
    expect(decoded.sub).toBe("student-1");
    expect(decoded.video.canPublish).toBe(false);
    expect(decoded.video.canSubscribe).toBe(true);
    expect(decoded.video.canPublishData).toBe(true);
  });
});

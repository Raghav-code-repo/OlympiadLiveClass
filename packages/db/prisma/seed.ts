import dotenv from "dotenv";
import path from "path";

// Load environment variables from packages/db/.env or root .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean existing data in safe order
  await prisma.answer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.classQuiz.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.question.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.recording.deleteMany();
  await prisma.class.deleteMany();
  await prisma.batchEnrollment.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@olympiad.edu",
      name: "Super Admin",
      passwordHash: defaultPasswordHash,
      role: "ADMIN",
      isEmailVerified: true,
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // 2. Create 2 Teachers
  const teacher1 = await prisma.user.create({
    data: {
      email: "hcv@olympiad.edu",
      name: "Prof. H.C. Verma (Physics)",
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      isEmailVerified: true,
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: "irodov@olympiad.edu",
      name: "Dr. I.E. Irodov (Mechanics)",
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      isEmailVerified: true,
    },
  });
  console.log(`Created teachers: ${teacher1.email}, ${teacher2.email}`);

  // 3. Create 20 Students
  const students = [];
  for (let i = 1; i <= 20; i++) {
    const student = await prisma.user.create({
      data: {
        email: `student${i}@olympiad.edu`,
        name: `Olympiad Prodigy ${i}`,
        passwordHash: defaultPasswordHash,
        role: "STUDENT",
        isEmailVerified: true,
      },
    });
    students.push(student);
  }
  console.log(`Created ${students.length} students`);

  // 4. Create 6 Batches across different subjects
  const batch1 = await prisma.batch.create({
    data: {
      name: "INPhO Phoenix Olympiad Batch (Grade 11-12)",
      description: "Intensive training for Indian National Physics Olympiad & IPhO",
      code: "INPHO-2026",
    },
  });

  const batch2 = await prisma.batch.create({
    data: {
      name: "NSEP Titans Olympiad Batch (Grade 9-10)",
      description: "Foundation Mechanics, Optics and Modern Physics for National Standard Exam in Physics",
      code: "NSEP-2026",
    },
  });

  const batch3 = await prisma.batch.create({
    data: {
      name: "INMO Math Warriors Batch (Grade 11-12)",
      description: "Advanced Number Theory, Algebra, Geometry & Combinatorics for Indian National Math Olympiad",
      code: "INMO-2026",
    },
  });

  const batch4 = await prisma.batch.create({
    data: {
      name: "NCERT Chemistry Olympiad Cohort (Grade 11-12)",
      description: "Physical, Organic & Inorganic Chemistry for JEE & IChO preparation",
      code: "INO-CHEM-2026",
    },
  });

  const batch5 = await prisma.batch.create({
    data: {
      name: "Biology Olympiad Aspire Group (Grade 11-12)",
      description: "Genetics, Ecology, Biochemistry & Human Physiology for IBO preparation",
      code: "IBO-BIO-2026",
    },
  });

  const batch6 = await prisma.batch.create({
    data: {
      name: "NTSE Aptitude Achievers (Grade 9-10)",
      description: "Mental Ability, Reasoning, General Knowledge & Quantitative Aptitude",
      code: "NTSE-2026",
    },
  });
  console.log(`Created 6 batches: INPHO, NSEP, INMO, IChO, IBO, NTSE`);

  // Enroll students: distribute across all 6 batches
  const allBatches = [batch1, batch2, batch3, batch4, batch5, batch6];
  const batchAssignments = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 0, 1, 2, 3, 4, 5, 0, 1];
  for (let i = 0; i < students.length; i++) {
    const batchIdx = batchAssignments[i % batchAssignments.length];
    await prisma.batchEnrollment.create({
      data: {
        userId: students[i].id,
        batchId: allBatches[batchIdx].id,
      },
    });
  }
  console.log("Enrolled 20 students into 6 batches");

  // 5. Create 3 Classes
  const now = new Date();
  const class1 = await prisma.class.create({
    data: {
      title: "Rotational Dynamics & Gyroscopic Precession Masterclass",
      description: "Conservation of angular momentum, moment of inertia tensor, and rolling without slipping.",
      subject: "Physics",
      batchId: batch1.id,
      teacherId: teacher1.id,
      status: "SCHEDULED",
      scheduledAt: new Date(now.getTime() + 1000 * 60 * 60 * 2), // in 2 hours
      durationMins: 90,
    },
  });

  const class2 = await prisma.class.create({
    data: {
      title: "Electromagnetic Induction & Faraday-Lenz Paradoxes",
      description: "Motional EMF, betatron acceleration condition, and non-conservative electric fields.",
      subject: "Physics",
      batchId: batch1.id,
      teacherId: teacher2.id,
      status: "LIVE",
      scheduledAt: now,
      actualStartAt: now,
      durationMins: 90,
    },
  });

  const class3 = await prisma.class.create({
    data: {
      title: "Geometrical Optics: Fermat's Principle & Matrix Methods",
      description: "Refraction through curved surfaces, chromatic aberrations, and optical instruments.",
      subject: "Physics",
      batchId: batch2.id,
      teacherId: teacher1.id,
      status: "SCHEDULED",
      scheduledAt: new Date(now.getTime() + 1000 * 60 * 60 * 24), // tomorrow
      durationMins: 60,
    },
  });
  console.log("Created 3 classes");

  // 6. Create 10-question Physics Olympiad Question Bank
  const questionsData = [
    {
      stem: "A uniform thin rod of mass M and length L is suspended vertically from a frictionless hinge at one end. A bullet of mass m traveling horizontally with velocity v hits the lower end and gets embedded. What is the angular velocity of the rod immediately after collision?",
      type: "MCQ_SINGLE",
      optionsJson: JSON.stringify([
        { id: "A", text: "3mv / ((M + 3m)L)" },
        { id: "B", text: "2mv / ((2M + 3m)L)" },
        { id: "C", text: "mv / (ML)" },
        { id: "D", text: "6mv / ((M + 2m)L)" },
      ]),
      correctAnswer: "A",
      explanation: "Using conservation of angular momentum about the hinge: L_initial = m * v * L. L_final = I_total * omega. I_total = (1/3)*M*L^2 + m*L^2 = ((M/3) + m)*L^2. Equating gives omega = 3mv / ((M + 3m)L).",
      difficulty: "OLYMPIAD",
      subject: "Physics",
      topic: "Rotational Dynamics",
      marks: 4.0,
      negativeMarks: 1.0,
      timeLimitSeconds: 90,
    },
    {
      stem: "A projectile is launched from ground level with speed 50 m/s at an elevation angle theta = 37° (take sin 37° = 0.6, cos 37° = 0.8, g = 10 m/s²). What is the maximum height reached in meters?",
      type: "NUMERIC",
      optionsJson: JSON.stringify([]),
      correctAnswer: "45",
      explanation: "H_max = (u_y)^2 / (2g) = (50 * 0.6)^2 / (2 * 10) = 900 / 20 = 45 meters.",
      difficulty: "EASY",
      subject: "Physics",
      topic: "Kinematics",
      marks: 4.0,
      negativeMarks: 0.0,
      timeLimitSeconds: 60,
    },
    {
      stem: "A solid cylinder and a thin-walled hollow cylinder of the same mass M and radius R roll down an incline of angle alpha without slipping from rest. Which body arrives at the bottom first?",
      type: "MCQ_SINGLE",
      optionsJson: JSON.stringify([
        { id: "A", text: "The solid cylinder because it has a lower moment of inertia factor (k^2/R^2 = 1/2)." },
        { id: "B", text: "The hollow cylinder because all its mass is distributed at the rim." },
        { id: "C", text: "Both arrive at the exact same instant since mass and radius are equal." },
        { id: "D", text: "It depends on the coefficient of static friction." },
      ]),
      correctAnswer: "A",
      explanation: "Linear acceleration a = g sin(alpha) / (1 + I/(MR^2)). For solid cylinder, denominator is 1.5; for hollow cylinder, denominator is 2.0. Hence solid cylinder has greater acceleration.",
      difficulty: "MEDIUM",
      subject: "Physics",
      topic: "Rotational Dynamics",
      marks: 4.0,
      negativeMarks: 1.0,
      timeLimitSeconds: 60,
    },
    {
      stem: "An ideal diatomic gas undergoes an adiabatic reversible expansion from volume V to 2V. Which of the following statements are correct? (Select all that apply)",
      type: "MCQ_MULTI",
      optionsJson: JSON.stringify([
        { id: "A", text: "The temperature of the gas decreases." },
        { id: "B", text: "The entropy of the gas increases." },
        { id: "C", text: "Work done by the gas is positive." },
        { id: "D", text: "The internal energy of the gas decreases." },
      ]),
      correctAnswer: JSON.stringify(["A", "C", "D"]),
      explanation: "In reversible adiabatic expansion: Q = 0, delta S = 0. delta W > 0 since dV > 0. By First Law: delta U = -delta W < 0, hence internal energy decreases and temperature drops.",
      difficulty: "HARD",
      subject: "Physics",
      topic: "Thermodynamics",
      marks: 4.0,
      negativeMarks: 1.0,
      timeLimitSeconds: 90,
    },
    {
      stem: "According to Lenz's law, the direction of the induced electromotive force always opposes the magnetic flux change that produced it, in compliance with energy conservation.",
      type: "TRUE_FALSE",
      optionsJson: JSON.stringify([
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ]),
      correctAnswer: "true",
      explanation: "Lenz's law is a consequence of conservation of energy: if the induced current aided the flux change, spontaneous creation of infinite energy would occur.",
      difficulty: "EASY",
      subject: "Physics",
      topic: "Electromagnetism",
      marks: 2.0,
      negativeMarks: 0.5,
      timeLimitSeconds: 30,
    },
    {
      stem: "A biconvex lens with refractive index n_glass = 1.5 has focal length f = 20 cm in air. When completely immersed in water (n_water = 4/3), what is its new focal length in cm?",
      type: "NUMERIC",
      optionsJson: JSON.stringify([]),
      correctAnswer: "80",
      explanation: "Lens maker equation: 1/f = (n_rel - 1)(1/R1 - 1/R2). In air: 1/20 = (1.5 - 1) * K = 0.5 * K => K = 0.1. In water: n_rel = 1.5 / (4/3) = 9/8. 1/f_w = (9/8 - 1) * 0.1 = (1/8) * 0.1 = 1/80. Thus f_w = 80 cm.",
      difficulty: "MEDIUM",
      subject: "Physics",
      topic: "Optics",
      marks: 4.0,
      negativeMarks: 0.0,
      timeLimitSeconds: 75,
    },
    {
      stem: "In a Compton scattering experiment, a photon with wavelength lambda collides with a stationary electron and is scattered at 180° (backscattered). If lambda_c is the Compton wavelength h/(m_e * c), the wavelength shift delta lambda is:",
      type: "MCQ_SINGLE",
      optionsJson: JSON.stringify([
        { id: "A", text: "lambda_c" },
        { id: "B", text: "2 * lambda_c" },
        { id: "C", text: "0.5 * lambda_c" },
        { id: "D", text: "0" },
      ]),
      correctAnswer: "B",
      explanation: "Compton shift formula: delta lambda = lambda_c * (1 - cos theta). For theta = 180°, cos 180° = -1, so delta lambda = lambda_c * (1 - (-1)) = 2 * lambda_c.",
      difficulty: "OLYMPIAD",
      subject: "Physics",
      topic: "Modern Physics",
      marks: 4.0,
      negativeMarks: 1.0,
      timeLimitSeconds: 60,
    },
    {
      stem: "Consider two concentric conducting spherical shells of radii R1 and R2 (R1 < R2). The inner shell carries charge +Q and the outer shell is earthed. Which statements are correct?",
      type: "MCQ_MULTI",
      optionsJson: JSON.stringify([
        { id: "A", text: "The potential of the outer shell is zero." },
        { id: "B", text: "The electric field for r > R2 is zero everywhere." },
        { id: "C", text: "Charge on the outer shell's inner surface is -Q." },
        { id: "D", text: "The capacitance of the system is 4*pi*epsilon_0 * (R1*R2) / (R2 - R1)." },
      ]),
      correctAnswer: JSON.stringify(["A", "B", "C", "D"]),
      explanation: "Because outer shell is earthed, V(R2) = 0. Outer surface charge is 0, so E = 0 for r > R2. By Gauss law inner surface has -Q, forming a spherical capacitor.",
      difficulty: "HARD",
      subject: "Physics",
      topic: "Electrostatics",
      marks: 4.0,
      negativeMarks: 1.0,
      timeLimitSeconds: 90,
    },
    {
      stem: "A sound wave travels from air into water. Which of the following wave properties remains strictly unchanged?",
      type: "MCQ_SINGLE",
      optionsJson: JSON.stringify([
        { id: "A", text: "Frequency" },
        { id: "B", text: "Wavelength" },
        { id: "C", text: "Speed" },
        { id: "D", text: "Intensity" },
      ]),
      correctAnswer: "A",
      explanation: "Frequency is determined exclusively by the source vibration and remains strictly invariant across medium boundaries.",
      difficulty: "EASY",
      subject: "Physics",
      topic: "Waves & Sound",
      marks: 4.0,
      negativeMarks: 1.0,
      timeLimitSeconds: 45,
    },
    {
      stem: "In both nuclear fission of heavy nuclei (e.g. U-235) and fusion of light nuclei (e.g. Deuterium-Tritium), the average binding energy per nucleon of the reaction products is greater than that of the reactants.",
      type: "TRUE_FALSE",
      optionsJson: JSON.stringify([
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ]),
      correctAnswer: "true",
      explanation: "Energy release occurs whenever reaction products move closer to the peak of the binding energy per nucleon curve (Iron-56).",
      difficulty: "MEDIUM",
      subject: "Physics",
      topic: "Nuclear Physics",
      marks: 2.0,
      negativeMarks: 0.5,
      timeLimitSeconds: 40,
    },
  ];

  const createdQuestions = [];
  for (const q of questionsData) {
    const question = await prisma.question.create({
      data: {
        ...q,
        createdById: teacher1.id,
      },
    });
    createdQuestions.push(question);
  }
  console.log(`Created ${createdQuestions.length} Physics Olympiad questions`);

  // 7. Create 10-question Physics Olympiad Quiz
  const totalQuizMarks = createdQuestions.reduce(
    (acc, q) => acc + Number(q.marks),
    0
  );

  const physicsQuiz = await prisma.quiz.create({
    data: {
      title: "All-India Physics Olympiad National Screening Benchmark Quiz",
      description:
        "Comprehensive 10-question test covering Classical Mechanics, Rotational Dynamics, Thermodynamics, Electromagnetism, and Modern Physics.",
      teacherId: teacher1.id,
      batchId: batch1.id,
      isLiveOnly: false,
      totalMarks: totalQuizMarks,
      dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7), // 7 days
    },
  });

  // Link questions in ordered sequence
  for (let idx = 0; idx < createdQuestions.length; idx++) {
    await prisma.quizQuestion.create({
      data: {
        quizId: physicsQuiz.id,
        questionId: createdQuestions[idx].id,
        orderIndex: idx + 1,
        marks: createdQuestions[idx].marks,
      },
    });
  }

  // Associate Quiz with Class 2 (the LIVE class)
  await prisma.classQuiz.create({
    data: {
      classId: class2.id,
      quizId: physicsQuiz.id,
      order: 1,
    },
  });

  console.log(
    `Created Quiz "${physicsQuiz.title}" with 10 questions linked to Class 2`
  );
  console.log(" Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

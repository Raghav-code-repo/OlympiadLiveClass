import { Router, Response } from "express";
import { prisma } from "@repo/db";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { getStorageAdapter } from "../storage";

const router = Router();

// GET /api/recordings/class/:classId - list recordings for a class
router.get(
  "/class/:classId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { classId } = req.params;
      const recordings = await prisma.recording.findMany({
        where: { classId, status: "READY" },
        orderBy: { createdAt: "desc" },
      });

      const storage = getStorageAdapter();
      const withSignedUrls = await Promise.all(
        recordings.map(async (rec) => {
          const playbackUrl = rec.hlsPlaylistKey
            ? await storage.getSignedUrl(rec.hlsPlaylistKey, 7200)
            : await storage.getSignedUrl(rec.storageKey, 7200);

          const thumbnailUrl = rec.thumbnailKey
            ? await storage.getSignedUrl(rec.thumbnailKey, 7200)
            : null;

          return {
            id: rec.id,
            classId: rec.classId,
            durationSec: rec.durationSec,
            sizeBytes: rec.sizeBytes.toString(),
            status: rec.status,
            playbackUrl,
            thumbnailUrl,
            createdAt: rec.createdAt,
          };
        })
      );

      res.json({ recordings: withSignedUrls });
    } catch (err: any) {
      console.error("Fetch recordings error:", err);
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  }
);

// GET /api/recordings/:id/playback - get signed playback URL and quiz chapters
router.get(
  "/:id/playback",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const recording = await prisma.recording.findUnique({
        where: { id },
        include: {
          class: {
            include: {
              quizzes: {
                include: {
                  quiz: {
                    include: {
                      questions: {
                        include: { question: true },
                        orderBy: { orderIndex: "asc" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!recording || recording.status !== "READY") {
        res.status(404).json({ error: "Recording not ready or not found" });
        return;
      }

      const storage = getStorageAdapter();
      const playbackUrl = recording.hlsPlaylistKey
        ? await storage.getSignedUrl(recording.hlsPlaylistKey, 7200)
        : await storage.getSignedUrl(recording.storageKey, 7200);

      // Extract quiz questions as chapter markers along the video duration
      const chapters: Array<{
        title: string;
        timeSec: number;
        questionId: string;
      }> = [];

      let runningTime = 60; // start at 60s
      for (const cq of recording.class.quizzes) {
        for (const qq of cq.quiz.questions) {
          chapters.push({
            title: `Quiz: ${qq.question.topic} - Q${qq.orderIndex}`,
            timeSec: Math.min(runningTime, recording.durationSec || 3600),
            questionId: qq.question.id,
          });
          runningTime += 300; // spread every 5 mins
        }
      }

      res.json({
        recording: {
          id: recording.id,
          classTitle: recording.class.title,
          durationSec: recording.durationSec,
          playbackUrl,
          chapters,
        },
      });
    } catch (err: any) {
      console.error("Playback error:", err);
      res.status(500).json({ error: "Failed to load recording playback" });
    }
  }
);

export default router;

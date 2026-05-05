import express from "express";
import {
  getTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  deleteTask,
} from "../controllers/tasks.controller.js";

const router = express.Router();

router.get("/", getTasks);
router.post("/", createTask);
router.patch("/:id", updateTaskStatus);
router.patch("/:id/edit", updateTask);
router.delete("/:id", deleteTask);


export default router;

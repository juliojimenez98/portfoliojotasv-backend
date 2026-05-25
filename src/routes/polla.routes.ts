import { Router } from "express";
import {
  createGroup,
  getMyGroups,
  getGroup,
  joinGroup,
  toggleMemberPayment,
  setTournamentResults,
  addMember,
  removeMember,
  getMatches,
  createMatch,
  bulkCreateMatches,
  setMatchResult,
  suggestFixture,
  getMyPredictions,
  setSpecialPredictions,
  upsertMatchPrediction,
} from "../controllers/polla.controller";
import { protect, authorize } from "../middlewares/auth";

const router = Router();

router.use(protect);
router.use(authorize("polla_futbolera"));

router.route("/groups").get(getMyGroups).post(createGroup);
router.post("/groups/join", joinGroup);
router.get("/groups/:id", getGroup);
router.patch("/groups/:id/members/:userId/payment", toggleMemberPayment);
router.post("/groups/:id/members", addMember);
router.delete("/groups/:id/members/:userId", removeMember);
router.patch("/groups/:id/results", setTournamentResults);

router.route("/groups/:id/matches").get(getMatches).post(createMatch);
router.post("/groups/:id/matches/bulk", bulkCreateMatches);
router.patch("/groups/:id/matches/:matchId/result", setMatchResult);

router.get("/fixture/suggest", suggestFixture);

router.get("/groups/:id/predictions/me", getMyPredictions);
router.put("/groups/:id/predictions/special", setSpecialPredictions);
router.put("/groups/:id/predictions/match/:matchId", upsertMatchPrediction);

export default router;

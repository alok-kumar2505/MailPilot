import { Router } from 'express';
import { slackController } from '../controllers/slack.controller';

const router = Router();

router.get('/connect', slackController.connect.bind(slackController));
router.get('/callback', slackController.callback.bind(slackController));
router.get('/status', slackController.status.bind(slackController));
router.delete('/disconnect', slackController.disconnect.bind(slackController));

export default router;

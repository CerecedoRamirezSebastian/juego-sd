const express = require('express');
const router = require('express').Router();
const app = express();

const homepageController = require('../controllers/HomepageController');
const gameController = require('../controllers/GameController')

router.get('/', homepageController.index);

router.get('/game/basta', gameController.gameStart);

module.exports = router;

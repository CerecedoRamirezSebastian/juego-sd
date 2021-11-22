const express = require("express");
const app = express();

exports.gameStart = (req, res) => {
  res.render('game/basta');
}


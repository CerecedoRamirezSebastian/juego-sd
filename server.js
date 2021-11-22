const express = require('express');
const webRoutes = require('./routes/web');

let cookieParser = require('cookie-parser');
let session = require('express-session');
let flash = require('express-flash');

const app = express();

const server = require('http').Server(app);
const io  =require('socket.io')(server);

const appConfig = require('./configs/app');

const exphbs = require('express-handlebars');
const hbshelpers = require("handlebars-helpers");
const multihelpers = hbshelpers();
const extNameHbs = 'hbs';
const hbs = exphbs.create({
  extname: extNameHbs,
  helpers: multihelpers
});
app.engine(extNameHbs, hbs.engine);
app.set('view engine', extNameHbs);

let sessionStore = new session.MemoryStore;
app.use(cookieParser());
app.use(session({
  cookie: { maxAge: 60000 },
  store: sessionStore,
  saveUninitialized: true,
  resave: 'true',
  secret: appConfig.secret
}));
app.use(flash());

app.use(express.urlencoded({ extended: true }))

app.use('/', express.static(__dirname + '/public'));

app.use('/', webRoutes);

server.listen(appConfig.expressPort, () => {
  console.log(`Server is listenning on ${appConfig.expressPort}! (http://localhost:${appConfig.expressPort})`);
});

class Game {
  constructor() {
      this.players = [];
      this.otherPlayers = [];
      this.randLetter = null;
      this.gameover = false;
  }

  newPlayer(player) {
    if (this.players.length < 2) {
      this.players.push(player);
      if(this.players.length == 2) {
        this.players[0].opponent = this.players[1];
        this.players[1].opponent = this.players[0];
      }
    }
    else
    {
      this.otherPlayers.push(player);
    }
    
  }

  endGame() {
      this.players[0].opponent = 'unmatched';
      this.players[0].points = 0;
      this.players[0].status = 'undefined';
      this.players[1].opponent = 'unmatched';
      this.players[1].points = 0;
      this.players[1].status = 'undefined';
      this.players.pop();

      this.gameover = false;
    
      for(var i = 0; i < this.otherPlayers.length; i++) {
        if (this.players.length < 2) {
          this.newPlayer(this.otherPlayers[0]);
          this.otherPlayers.splice(0, 1);
          console.log("New active player: " + this.players.length);
          console.log("Updated waitlist: " + this.otherPlayers.length);
      }
    }
  }

  deletePlayer(id) {
    for(var i = 0; i < this.players.length; i++) {
      if(this.players[i].id == id) {
        this.players.splice(i, 1);
        console.log("Active player deleted " + this.players.length);
        var limit = this.otherPlayers.length;
      
        for(var i = 0; i < limit; i++) {
          if (this.players.length < 2) {
          this.newPlayer(this.otherPlayers[0]);
          this.otherPlayers.splice(0, 1);
          console.log("New active player: " + this.players.length);
          console.log("Updated waitlist: " + this.otherPlayers.length);
          }
        }
        return;
      }
    }

    for(var i = 0; i < this.otherPlayers.length; i++) {
      if(this.otherPlayers[i].id == id) {
        this.otherPlayers.splice(i, 1);
        console.log("Wait list player deleted " + this.otherPlayers.length);
        return;
      }
    }
  }

  evalAnswers(nombre, color, fruto, numPlayer, letter){
    var namePoints = 0;
    var colorPoints = 0;
    var fruitPoints = 0;
    var totalPoints;

    if (nombre.charAt(0) == letter) {
      namePoints = 1;
    }
    if (color.charAt(0) == letter) {
      colorPoints = 1;
    }
    if (fruto.charAt(0) == letter) {
      fruitPoints = 1;
    }
    totalPoints = namePoints + colorPoints + fruitPoints;
    this.players[numPlayer].points = totalPoints;
    console.log(this.players[numPlayer].points);
    
  }

  findWinner(){
    if(this.players[0].points > this.players[1].points){
      this.players[0].status = "Ganaste!";
      this.players[1].status = "Perdiste ):";
    }
    
    if(this.players[0].points < this.players[1].points){
      this.players[1].status = "Ganaste!";
      this.players[0].status = "Perdiste ):";
    }
    
    if (this.players[0].points == this.players[1].points) {
      this.players[0].status = "Empate!";
      this.players[1].status = "Empate!";    
    }

    this.gameover = true;

  }
}

class Player {

  constructor(socket) {
      this.socket = socket;
      this.id = socket.id;
      this.opponent = 'unmatched';
      this.points = 0;
      this.status = 'undefined';
  }

  setOpponent(player) {
    this.opponent = player;
  }

}

let game = new Game();
var cont = 0;
var playNum = 0;
var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

io.on('connection', (socket) => {

  console.log("Client connected: " + socket.id);
  playNum ++;
  player = new Player(socket);

  game.newPlayer(player);  

  socket.emit('playerConn', {message: `Bienvenido al juego, jugador ${playNum}.`});

  socket.on("disconnect", () => {

    playNum--;
    console.log("Client disconnected. ID: ", socket.id);
    socket.broadcast.emit("clientdisconnect", socket.id);
  });

  socket.on("disconnect", function() { 
      if(game.players[0].socket == socket && game.players[0].opponent != null) {
        game.players[0].opponent.socket.emit("opponent.left");
      }
      else if(game.players[1].socket == socket && game.players[1].opponent != null) {
        game.players[1].opponent.socket.emit("opponnent.left");
      }
    game.deletePlayer(socket.id);

  });

  if (game.players.length == 2) {
    var genLetter = letters[Math.floor((Math.random() * 26))];
    this.randLetter = genLetter;
    
    game.players[0].socket.emit("sendParameters", {
      letter: genLetter,
      number: 0
    });

    game.players[1].socket.emit("sendParameters", {
      letter: genLetter,
      number: 1
    });
  }

  socket.on("wordsSent", function() {
    game.players[0].socket.emit("count");
    game.players[1].socket.emit("count");
  });

  socket.on('make.move', (data) => {
    console.log('Respuestas del jugador: ' + data.jugador + ' son: ', data);
    game.evalAnswers(data.nombre, data.color, data.fruto, data.jugador, this.randLetter);
    cont++;

    if (cont == 2) {
      game.findWinner();

      if (game.gameover == true) {
        game.players[0].socket.emit("showResults", {
          status: game.players[0].status,
          puntaje: game.players[0].points,
          oponente: game.players[0].opponent.points
        });
        game.players[1].socket.emit("showResults", {
          status: game.players[1].status,
          puntaje: game.players[1].points,
          oponente: game.players[1].opponent.points
        });

        game.endGame();
        cont = 0;

        if (game.players.length == 2) {
          var genLetter = [Math.floor((Math.random() * 26))]; 

          this.randLetter = genLetter;

          game.players[0].socket.emit("sendParameters", {
            letter: genLetter,
            number: 0
          });

          game.players[1].socket.emit("sendParameters", {
            letter: genLetter,
            number: 1
          });
        }
      } 
    }
  });
})
const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
const players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniquesocket) => {
    console.log("connected");

    if(!players.white){
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    }
    else if(!players.black){
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    }
    else{
        uniquesocket.emit("spectatorRole")
    }

    uniquesocket.on("disconnect", () => {
        if(uniquesocket.id === players.white){
            delete players.white;
            // Notify the other player that the white player disconnected
            io.emit("playerDisconnected", "White player has disconnected. Please reset the game.");
        }
        else if(uniquesocket.id === players.black ){
            delete players.black;
            // Notify the other player that the black player disconnected
            io.emit("playerDisconnected", "Black player has disconnected. Please reset the game.");
        }
        console.log(uniquesocket.id + " disconnected");
    });

    uniquesocket.on("move", (move) => {
        try {
            if(chess.turn() === 'w' && uniquesocket.id !== players.white ) return;
            if(chess.turn() === 'b' && uniquesocket.id !== players.black ) return;

            const result = chess.move(move);
            if(result){
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            }else{
                console.log("Invalid move: ", move);
                uniquesocket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log(err);
            uniquesocket.emit("Invalid move", move);
        }
    });

    // **RESET GAME LOGIC**
    uniquesocket.on("resetGame", () => {
        // Reset the game to its initial state
        chess.reset();  // This resets the chess game
        io.emit("boardState", chess.fen());  // Emit the updated board state to both players
    });
});

server.listen(3000, () => {
    console.log("Server started on port 3000");
});

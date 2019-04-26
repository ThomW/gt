/*

G.T.E.T. by ThomW

Apologies to everyone who plays this

*/

var gameWidth = 320;
var gameHeight = 210;

if (gameWidth < gameHeight) {
    scaleFactor = window.innerHeight / gameHeight;
} else {
    scaleFactor = window.innerWidth / gameWidth;
}

console.log(window.innerWidth + ' x ' + window.innerHeight);
console.log('scaleFactor:' + scaleFactor + ' width: ' + (gameWidth * scaleFactor) + ' height: ' + (gameHeight * scaleFactor));

if (gameHeight * scaleFactor > window.innerHeight) {
    scaleFactor = window.innerHeight / gameHeight;
} else if (gameWidth * scaleFactor > window.innerWidth) {
    scaleFactor = window.innerWidth / gameWidth;
}

console.log('scaleFactor:' + scaleFactor + ' width: ' + (gameWidth * scaleFactor) + ' height: ' + (gameHeight * scaleFactor));

scaleFactor = Math.floor(scaleFactor);

// window.document.getElementById('game').style('margin-left', '-' + (gameWidth * scaleFactor * 0.5) + 'px');

// DEBUG: Override the scale factor code
// scaleFactor = 1;

var game = new Phaser.Game(gameWidth * scaleFactor, gameHeight * scaleFactor, Phaser.CANVAS, 'game', { preload: preload, create: create, update: update, render: render });


function preload () {

   // Needed to combat content caching
   var imgFolder = 'img/';

   var imgNames = ['bg-01', 'bg-02', 'bg-03', 'bg-04', 'bg-05', 'bg-06', 'bg-07', 'title', 'font', 'macguffin1', 'macguffin2', 'macguffin3'];
   for (var i = 0; i < imgNames.length; i++) {
      game.load.image(imgNames[i], imgFolder + imgNames[i] + '.png');
   }

   game.load.spritesheet('player', 'img/player.png', 21, 24, 7);


   // game.load.atlasJSONHash('sprites', 'img/sprites.png', 'img/sprites.json');

   // game.load.audio('catch', 'sounds/catch.wav');
   // game.load.audio('fail', ['sounds/fail.mp3', 'sounds/fail.ogg']);


   /*
   if (game.device.desktop) {
      game.load.spritesheet('gameover', imgFolder + 'game-over.png', 734, 46);
   } else {
      game.load.spritesheet('gameover', imgFolder + 'game-over-mobile.png', 627, 46);
   }
   game.load.spritesheet('explosion', imgFolder + 'explosion.png', 64, 32);

   for (var i = 0; i < soundNames.length; i++) {
      game.load.audio(soundNames[i], 'audio/' + soundNames[i] + '.mp3');
   }
   */
}


var GAME_STATE_BUSY = 0;
var GAME_STATE_TITLE = 1;
var GAME_STATE_INTRO = 2; // This is the starting 'cutscene'
var GAME_STATE_PLAYING = 3;
var GAME_STATE_NECKUP = 5; // This is a special case where the player is in the overworld, but doing the neck thing
var GAME_STATE_PLAYER_IN_HOLE = 4;
var GAME_STATE_END_GAME = 15;
var GAME_STATE_GAME_OVER = 16;

var gameState = GAME_STATE_TITLE;

var background;
var player;

var score = 0;

var scoreText;
var introText;

var screen = 1;

var holes = [];

var macguffinImages = [];
var macguffinLocations = [];

var animations = [];

// Blueprints tell us where the holes are.
var blueprints = {
        1: [],
        2: [[96,64,32,4,'x'], [88,68,32,2,'x'], [80,70,24,4,'x'], [72,72,24,6,'x'], [64,74,8,2,'x'],[80,78,32,2,'x'], [87,80,32,2,'x'], [96,82,32,4,'x'], [88,118,8,10,'x'], [72,120,40,6,'x'], [64,122,56,2,'x']],
        3: [[89, 54, 15, 20, 'xy'], [80, 56, 32, 16, 'xy'], [72,58, 48, 12, 'xy'], [64, 60, 63, 8, 'xy'], [56, 62, 80, 4, 'xy']],
        4: [[80, 57, 7, 76, 'x'], [73, 68, 22, 54, 'x'], [65, 85, 38, 23, 'x'], [152, 64, 16, 14, 'y'], [144, 66, 32, 10, 'y'], [136, 68, 48, 6, 'y']],
        5: [[32,48,16,14,'xy'],[32,50,32,10,'xy'],[32,52,40,6,'xy'], [88,88,16,16,'x'],[80,90,32,12,'x'],[72,92,48,8,'x'],[63,94,65,4,'x'], [144,48,32,14,'y'], [128,50,64,10,'y'], [120,52,80,6,'y']] ,
        6: []
    }

// These are used when the player emerges victoriously from a hole
var lastScreen = 0;
var lastPosition = [];

function introStart() {

    gameState = GAME_STATE_INTRO;

    // TODO: Add the spaceship sprite

    // Drop the player into the scene
    player.visible = true;
    introTween = game.add.tween(player).to( { y: game.world.centerY }, 200, Phaser.Easing.Linear.None, true);
    introTween.onComplete.add(gameStart, this);
    
    screen = 1;
    background.loadTexture('bg-01');
}

function gameStart() {

    gameState = GAME_STATE_PLAYING;

    // Randomize the macguffins' locations
    // Screens 2-5 are the screens with holes
    while (Object.keys(macguffinLocations).length < 3) {
        var screenIdx = rnd(2, 5);
        var holeIdx = rnd(0, blueprints[screenIdx].length);
        macguffinLocations['' + screenIdx] = holeIdx; // Hack to force array to be associative
    }

    score = 9999;
    updateScore(score);
}


function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.physics.setBoundsToWorld();

    //  We check bounds collisions against all walls other than the bottom one
    game.physics.arcade.checkCollision.down = false;

    background = game.add.sprite(0, 0, 'title');
    background.scale.setTo(scaleFactor, scaleFactor);

    player = game.add.sprite(game.world.centerX, 0, 'player');
    player.scale.setTo(scaleFactor, scaleFactor);
    player.anchor.setTo(0.5, 0);
    game.physics.enable(player, Phaser.Physics.ARCADE);
    player.body.setSize(16, 5, 2, 18); // Adjust the size of the player's bounding box
    player.visible = false;

    // Setup some variables I'm glomming onto the player object
    player.isHovering = false;
    player.numCandies = 0;
    player.macguffinScreens = []; // This will track which screens the player has fallen into holes and found macguffin pieces

    player.animations.add('walk', [0, 1, 2], 10, true);
    player.animations.add('neckup', [3, 4, 5, 6], 10, false);

    // The neckdown animation has a 
    animations['neckdown'] = player.animations.add('neckdown', [6, 5, 4, 3, 0], 10, false);
    animations['neckdown'].onComplete.add(onNeckdownComplete, this);

    scoreText = game.add.retroFont('font', 15, 7, '0123456789', 10);
    scoreImg = game.add.image(160 * scaleFactor, 175 * scaleFactor, scoreText);
    scoreImg.scale.setTo(scaleFactor, scaleFactor);
    scoreImg.anchor.setTo(0.5, 0.5);
    hideScore();

    // Setup the Macguffin status display
    for (var i = 1; i <= 3; i++) {
        var macguffinImg = game.add.sprite(10 * scaleFactor + 20 * i * scaleFactor, 10 * scaleFactor, 'macguffin' + i);
        macguffinImg.scale.setTo(scaleFactor, scaleFactor);
        // macguffinImg.visible = false;
        macguffinImages.push(macguffinImg);
    }



    gameState = GAME_STATE_TITLE;
    game.input.onDown.addOnce(introStart, this);
}


function update () {

    if (gameState == GAME_STATE_PLAYING) {

        speed = 2 * scaleFactor;

        // This sucks, but it does fix the problem we'd have if the player had both A and D held (for instance)
        var startingPos = player.x + ',' + player.y;

        if (game.input.keyboard.isDown(Phaser.Keyboard.A)) {
            player.x -= speed;
            player.scale.x = -1 * scaleFactor; // Flip sprite left
        } 
        if (game.input.keyboard.isDown(Phaser.Keyboard.D)) {
            player.x += speed;
            player.scale.x = scaleFactor; // Flip sprite right
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.W)) {
            player.y -= speed;
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.S)) {
            player.y += speed;
        }

        if (player.isHovering && !game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            player.animations.play('neckdown');
        }

        var finalPos = player.x + ',' + player.y;

        if (!player.isHovering) {
            if (startingPos != finalPos) {
                player.animations.play('walk');
            } else {
                player.animations.stop();
                player.frame = 0; // Plant the player's feet
            }
        }

        // Player has to be stationary to raise his neck
        if (!player.isHovering && startingPos == finalPos && game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            
            gameState = GAME_STATE_NECKUP;
            player.animations.play('neckup');

            // TODO: Reveal the location of the macguffin on this screen?
        }

        PLAYER_MIN_X = 42;
        PLAYER_MAX_X = 278;
        PLAYER_MIN_Y = 23;
        PLAYER_MAX_Y = 135;

        // Don't let the player change screens when they're hovering
        if (player.isHovering) {
            if (player.y < PLAYER_MIN_Y * scaleFactor) {
                player.y = PLAYER_MIN_Y * scaleFactor;
            }
            if (player.x > PLAYER_MAX_X * scaleFactor) {
                player.x = PLAYER_MAX_X * scaleFactor;
                
            }
            if (player.y > PLAYER_MAX_Y * scaleFactor) {
                player.y = PLAYER_MAX_Y * scaleFactor;
            }
            if (player.x < PLAYER_MIN_X * scaleFactor) {
                player.x = PLAYER_MIN_X * scaleFactor;
            }
        } else {
            // Change the background when the character hits the edge of a screen
            if (player.y < PLAYER_MIN_Y * scaleFactor) {
                player.y = PLAYER_MAX_Y * scaleFactor;
                changeScreen(screen, 0);
            }
            else if (player.x > PLAYER_MAX_X * scaleFactor) {
                player.x = PLAYER_MIN_X * scaleFactor;
                changeScreen(screen, 1);
            }
            else if (player.y > PLAYER_MAX_Y * scaleFactor) {
                player.y = PLAYER_MIN_Y * scaleFactor;
                changeScreen(screen, 2);
            }
            else if (player.x < PLAYER_MIN_X * scaleFactor) {
                player.x = PLAYER_MAX_X * scaleFactor;
                changeScreen(screen, 3);
            }
        }


        // Look for collisions with rectangles when the player isn't hovering
        if (!player.isHovering) {

            if (isPlayerTouchingHole()) {
                
                // Store the last screen and position for when we get out of the stupid hole
                lastScreen = screen;
                lastPosition = [player.x, player.y];

                // Should this screen have a macguffin piece?
                if (player.macguffinScreens.indexOf(screen)) {

                }

                // Move the player to the center top of the screen so they can fall
                player.x = game.world.centerX;
                player.y = (PLAYER_MIN_Y + 10) * scaleFactor;

                // Change to the hole background
                background.loadTexture('bg-07');
                gameState = GAME_STATE_PLAYER_IN_HOLE;
            }
        }


    }
    else if (gameState == GAME_STATE_NECKUP) {

        // The player can't move, and all we're really looking for is the spacebar to be released
        if (!game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            gameState = GAME_STATE_NECKUP;
            player.animations.play('neckdown');
        }

        // Indicate any macguffins on this screen
        var screenKey = '' + screen;
        if (screenKey in macguffinLocations) {
            console.log('MACGUFFIN FOUND!!!');
        }

    }


    else if (gameState == GAME_STATE_PLAYER_IN_HOLE) {

        // This sucks, but it does fix the problem we'd have if the player had both A and D held (for instance)
        var startingPos = player.x;

        if (game.input.keyboard.isDown(Phaser.Keyboard.A)) {
            player.x -= speed;
            player.scale.x = -1 * scaleFactor; // Flip sprite left
        } 
        if (game.input.keyboard.isDown(Phaser.Keyboard.D)) {
            player.x += speed;
            player.scale.x = scaleFactor; // Flip sprite right
        }

        speed = 0.5 * scaleFactor;

        if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {

            if (player.isHovering == false) {
                player.animations.play('neckup');
            }

            player.y -= speed;

            player.isHovering = true;
            
        } else {

            // If the spacebar isn't held, the player is falling

            if (player.isHovering) {
                player.animations.play('neckdown');
            }

            player.isHovering = false;

            player.y += speed;
        }

        var HOLE_FLOOR = 120 * scaleFactor;

        // Player has floated up the screen enough to return to the overworld
        if (player.y < PLAYER_MIN_Y * scaleFactor) {

            // GTFO of the stupid hole
            gameState = GAME_STATE_PLAYING;

            player.x = lastPosition[0];
            player.y = lastPosition[1];

            background.loadTexture('bg-0' + lastScreen);

        } else if (player.y > HOLE_FLOOR) { 

            // Prevents player from falling through floor of hole
            player.y = HOLE_FLOOR;
        }

        var finalPos = player.x;

        if (!player.isHovering) {
            if (startingPos != finalPos) {
                player.animations.play('walk');
            } else {
                player.animations.stop();
                player.frame = 0; // Plant the player's feet
            }
        }
    }
}

// Direction should be 0=up, 1=right ... clockwise
function changeScreen(from, direction)
{
    // This emulates the completely screwy map ET had ... so weird.
    map = {
        1: [4, 5, 2, 3],
        2: [1, 5, 6, 3],
        3: [1, 6, 4, 2],
        4: [1, 3, 6, 5],
        5: [1, 4, 6, 2],
        6: [4, 3, 2, 5],
    }

    screen = map[from][direction];

    background.loadTexture('bg-0' +  screen);

    while (holes.length) {
        holes.pop();
    }


    // If we got holes, throw them  up
    if (blueprints[screen].length) {

        for (var i = 0; i < blueprints[screen].length; i++) {
            var b = blueprints[screen][i];

            holes.push(new Phaser.Rectangle(b[0] * scaleFactor, b[1] * scaleFactor, b[2] * scaleFactor, b[3] * scaleFactor));

            // Most of the screens have mirrored holes, so handle mirroring
            if (b.length >= 5) {

                // We have to do some funky-looking math because the hit detection doesn't work with rectangles with negative widths/heights
                var mirrorX = (160 - b[0]) * 2 - b[2];
                var mirrorY = (96 - b[1]) * 2 - b[3];

                if (b[4].indexOf('x') > -1) {
                    holes.push(new Phaser.Rectangle((mirrorX +  b[0]) * scaleFactor, b[1] * scaleFactor, b[2] * scaleFactor, b[3] * scaleFactor));
                }
                if (b[4].indexOf('y') > -1) {
                    holes.push(new Phaser.Rectangle(b[0] * scaleFactor, (mirrorY + b[1]) * scaleFactor, b[2] * scaleFactor, b[3] * scaleFactor));
                }
                if (b[4].indexOf('xy') > -1) {
                    holes.push(new Phaser.Rectangle((mirrorX + b[0]) * scaleFactor, (mirrorY + b[1]) * scaleFactor, b[2] * scaleFactor, b[3] * scaleFactor));
                }
            }
        }
    }
}

// This loops through the active holes and checks to see if the player's collision body is touching them
function isPlayerTouchingHole() {

    var boundsA = player.body;

    for (var i = 0; i < holes.length; i++) {
        if (Phaser.Rectangle.intersects(boundsA, holes[i])) {
            return true;
        }
    }

    return false;
}

// This is used to debug things in the game - collision, etc.
function render() {

    // game.debug.bodyInfo(player, 32, 32);

    // Look at player's collision
    // game.debug.body(player);

    /*
    // Look at holes' collision
    if (holes.length > 0) {
        for (var i = 0; i < holes.length; i++) {
            game.debug.geom(holes[i],'#0fffff44');
        }
    }
    */
}

function hideScore() {
    scoreText.visible = false;
}

function updateScore(value) {

    if (!scoreText.visible) {
        scoreText.visible = true;
    }

    // Pads the score with whitespace in front of the digits to keep it right-aligned
    scoreText.text = right('0000' + value, 4);
}

// Clear flags dealing with the neck animation
function onNeckdownComplete(sprite, animation) {
    gameState = GAME_STATE_PLAYING;
    player.isHovering = false;
}

// Returns the rightmost characters in a string
function right(str, chr) {
    return newstr = str.substr(str.length - chr, str.length);
}

// Returns an integer random number within our min/max range
function rnd(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

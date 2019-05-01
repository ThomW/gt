/*

G.T.E.T. by ThomW

Apologies to everyone who plays this

*/

var gameWidth = 720;
var gameHeight = 372;

if (gameWidth < gameHeight) {
    scaleFactor = window.innerHeight / gameHeight;
} else {
    scaleFactor = window.innerWidth / gameWidth;
}

if (gameHeight * scaleFactor > window.innerHeight) {
    scaleFactor = window.innerHeight / gameHeight;
} else if (gameWidth * scaleFactor > window.innerWidth) {
    scaleFactor = window.innerWidth / gameWidth;
}

scaleFactor = Math.floor(scaleFactor);

// Centers the window on the screen
var $game = window.document.getElementById('game');
$game.style.marginLeft = '-' + (gameWidth * scaleFactor * 0.5) + 'px';
$game.style.width = gameWidth * scaleFactor + 'px';

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

   game.load.spritesheet('player', 'img/player.png', 42, 64, 7);
   game.load.spritesheet('player-armed', 'img/player-armed.png', 42, 64, 7);
   game.load.spritesheet('ping', 'img/ping.png', 15, 15, 3);
   game.load.spritesheet('bullet', 'img/bullet.png', 17, 15, 4);
   game.load.spritesheet('thefeds', 'img/thefeds.png', 40, 60, 4);

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

var HOLE_FLOOR = 322 * scaleFactor;

var gameState = GAME_STATE_TITLE;

var background;
var player;

var score = 0;

var scoreText;
var introText;

var screen = 1;

var holes = [];

var macguffinSpot;
var macguffinImages = [];
var macguffinLocations = [];

var animations = [];

var weapon;

var blueprints = setupBlueprints();

// These are used when the player emerges victoriously from a hole
var lastScreen = 0;
var lastPosition = [];

var nextEnemyTime = null;

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
        var holeIdx = rnd(0, blueprints[screenIdx].length - 1);
        macguffinLocations[getScreenKey(screenIdx)] = holeIdx; // Hack to force array to be associative
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
    player.anchor.setTo(0.5, 1);
    game.physics.enable(player, Phaser.Physics.ARCADE);
    player.body.setSize(32, 10, 4, 55); // Adjust the size of the player's bounding box
    player.visible = false;

    // Setup some variables I'm glomming onto the player object
    player.isHovering = false;
    player.numCandies = 0;
    player.hasWeapon = true;

    player.animations.add('walk', [0, 1, 2], 10, true);
    player.animations.add('neckup', [3, 4, 5, 6], 10, false);

    // The neckdown animation has a 
    animations['neckdown'] = player.animations.add('neckdown', [6, 5, 4, 3, 0], 10, false);
    animations['neckdown'].onComplete.add(onNeckdownComplete, this);

    //  Creates 30 bullets, using the 'bullet' graphic
    weapon = game.add.weapon(30, 'bullet');
    weapon.bullets.setAll('scale.x', scaleFactor);
    weapon.bullets.setAll('scale.y', scaleFactor);
    weapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS;
    weapon.bulletSpeed = 600; //  The speed at which the bullet is fired
    weapon.fireRate = 120; // Delay between bullets in ms
    weapon.trackSprite(player, 0, -40 * scaleFactor); // Position toward player's head
    weapon.setBulletBodyOffset(4 * scaleFactor, 4 * scaleFactor, 0, 44);
    weapon.setBulletFrames(0, 3, false);
    weapon.bulletInheritSpriteSpeed = false;
    weapon.addBulletAnimation('bulletUp', [2], 0, false);
    weapon.addBulletAnimation('bulletRight', [1], 0, false);
    weapon.addBulletAnimation('bulletDown', [0], 0, false);
    weapon.addBulletAnimation('bulletLeft', [3], 0, false);


    macguffinSpot = game.add.sprite(0, 0, 'ping');
    macguffinSpot.scale.setTo(scaleFactor, scaleFactor);
    macguffinSpot.anchor.setTo(0.5, 0.5);
    macguffinSpot.visible = false;
    macguffinSpot.animations.add('blink', [0,1,2,1], 10, true);
    macguffinSpot.animations.play('blink');

    macguffinSprite = game.add.sprite(0, 0, 'macguffin1');
    macguffinSprite.scale.setTo(scaleFactor, scaleFactor);
    macguffinSprite.anchor.setTo(0.5, 0.5);
    macguffinSprite.x = 200 * scaleFactor;
    macguffinSprite.y = 315 * scaleFactor;
    game.physics.enable(macguffinSprite, Phaser.Physics.ARCADE);
    macguffinSprite.visible = false;

    thefeds = game.add.group();
    thefeds.enableBody = true;
    thefeds.physicsBodyType = Phaser.Physics.ARCADE;

    scoreText = game.add.retroFont('font', 15, 7, '0123456789', 10);
    scoreImg = game.add.image(160 * scaleFactor, 175 * scaleFactor, scoreText);
    scoreImg.scale.setTo(scaleFactor, scaleFactor);
    scoreImg.anchor.setTo(0.5, 0.5);
    hideScore();

    // Setup the Macguffin status display
    for (var i = 1; i <= 3; i++) {
        var macguffinImg = game.add.sprite(10 * scaleFactor + 20 * i * scaleFactor, 10 * scaleFactor, 'macguffin' + i);
        macguffinImg.scale.setTo(scaleFactor, scaleFactor);
        macguffinImg.visible = false;
        macguffinImages.push(macguffinImg);
    }

    gameState = GAME_STATE_TITLE;
    game.input.onDown.addOnce(introStart, this);
}


var WALKING_SPEED = 3 * scaleFactor;
var ENEMY_SPEED = 2 * scaleFactor;
s
function update () {

    if (gameState == GAME_STATE_PLAYING) {

        // This sucks, but it does fix the problem we'd have if the player had both A and D held (for instance)
        var startingPos = player.x + ',' + player.y;

        if (game.input.keyboard.isDown(Phaser.Keyboard.A)) {
            player.x -= WALKING_SPEED;
            player.scale.x = -1 * scaleFactor; // Flip sprite left
        } 
        if (game.input.keyboard.isDown(Phaser.Keyboard.D)) {
            player.x += WALKING_SPEED;
            player.scale.x = scaleFactor; // Flip sprite right
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.W)) {
            player.y -= WALKING_SPEED;
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.S)) {
            player.y += WALKING_SPEED;
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

        // Fire weapon?
        if (player.hasWeapon) {

            var FIRE_UP = 1, FIRE_RIGHT = 2, FIRE_DOWN = 4, FIRE_LEFT = 8;

            // This craziness is the laziest way I could think of to make sure that only one fire button is hit at a time
            var fireDir = 0;
            if (game.input.keyboard.isDown(Phaser.Keyboard.I)) { fireDir += FIRE_UP; }
            if (game.input.keyboard.isDown(Phaser.Keyboard.L)) { fireDir += FIRE_RIGHT; }
            if (game.input.keyboard.isDown(Phaser.Keyboard.K)) { fireDir += FIRE_DOWN; }
            if (game.input.keyboard.isDown(Phaser.Keyboard.J)) { fireDir += FIRE_LEFT; }

            if (fireDir == FIRE_UP) {
                weapon.fireAngle = Phaser.ANGLE_UP;
                weapon.bulletAnimation = 'bulletUp';
                weapon.fire();
            } else if (fireDir == FIRE_RIGHT) {
                weapon.fireAngle = Phaser.ANGLE_RIGHT;
                weapon.bulletAnimation = 'bulletRight';
                weapon.fire();
            } else if (fireDir == FIRE_DOWN) {
                weapon.fireAngle = Phaser.ANGLE_DOWN;
                weapon.bulletAnimation = 'bulletDown';
                weapon.fire();
            } else if (fireDir == FIRE_LEFT) {
                weapon.fireAngle = Phaser.ANGLE_LEFT;
                weapon.bulletAnimation = 'bulletLeft';
                weapon.fire();
            }
        }

        // Player has to be stationary to raise his neck
        if (!player.isHovering && startingPos == finalPos && game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            gameState = GAME_STATE_NECKUP;
            player.animations.play('neckup');
        }

        PLAYER_MIN_X = 10;
        PLAYER_MAX_X = 710;
        PLAYER_MIN_Y = 30;
        PLAYER_MAX_Y = 366;

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

            var holeTouched = playerTouchingHoleIdx();
            if (holeTouched != null) {
                
                // Store the last screen and position for when we get out of the stupid hole
                lastScreen = screen;
                lastPosition = [player.x, player.y];

                // Kill all fired bullets
                weapon.killAll();

                // Remove all enemies from the screen to respawn later
                thefeds.removeAll();

                // Should this screen have a macguffin piece?
                if (screenHasMacguffin(screen) 
                        && macguffinLocations[getScreenKey(screen)] == holeTouched
                        && numRemainingMacguffins() > 0) {

                    // (The 4- makes sure we're showing the macguffins in the right order)
                    macguffinSprite.loadTexture('macguffin' + (4 - numRemainingMacguffins()));

                    // Show the macguffin!
                    macguffinSprite.visible = true;

                } else {
                    macguffinSprite.visible = false;
                }

                // Move the player to the center top of the screen so they can fall
                player.x = game.world.centerX;
                player.y = (PLAYER_MIN_Y + 10) * scaleFactor;

                // Change to the hole background
                background.loadTexture('bg-07');
                gameState = GAME_STATE_PLAYER_IN_HOLE;
            }
        }

        updateEnemies();

    }
    else if (gameState == GAME_STATE_NECKUP) {

        // The player can't move, and all we're really looking for is the spacebar to be released
        if (!game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            gameState = GAME_STATE_NECKUP;
            player.animations.play('neckdown');
        }

        // Shine a spot on the macguffin this screen has one
        if (screenHasMacguffin(screen)) {
            macguffinSpot.visible = true;
        }

        updateEnemies();
    }

    else if (gameState == GAME_STATE_PLAYER_IN_HOLE) {

        // This sucks, but it does fix the problem we'd have if the player had both A and D held (for instance)
        var startingPos = player.x;

        if (game.input.keyboard.isDown(Phaser.Keyboard.A)) {
            player.x -= WALKING_SPEED;
            player.scale.x = -1 * scaleFactor; // Flip sprite left
        } 
        if (game.input.keyboard.isDown(Phaser.Keyboard.D)) {
            player.x += WALKING_SPEED;
            player.scale.x = scaleFactor; // Flip sprite right
        }

        if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {

            if (player.isHovering == false) {
                player.animations.play('neckup');
            }

            player.y -= WALKING_SPEED;

            player.isHovering = true;
            
        } else {

            // If the spacebar isn't held, the player is falling

            if (player.isHovering) {
                player.animations.play('neckdown');
            }

            player.isHovering = false;

            player.y += WALKING_SPEED;
        }

        // Player has floated up the screen enough to return to the overworld
        if (player.y < PLAYER_MIN_Y * scaleFactor) {

            // GTFO of the stupid hole
            gameState = GAME_STATE_PLAYING;

            player.x = lastPosition[0];
            player.y = lastPosition[1];

            background.loadTexture('bg-0' + lastScreen);

            macguffinSprite.visible = false;

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

        // Player is touching the macguffin!
        if (macguffinSprite.visible && isPlayerTouchingMacguffin()) {

            // TODO: PLAY SOUND
            
            // Hide the macguffin sprite
            macguffinSprite.visible = false;

            // Show the macguffin as being picked up in the top bar
            macguffinImages[3 - numRemainingMacguffins()].visible = true;
            
            // Remove the current screen from the list of locations that have macguffins
            delete macguffinLocations[getScreenKey(lastScreen)];

            // OHSHI... IT'S GO TIME!
            if (numRemainingMacguffins() == 0) {
                
                // TODO: PLAY SOUND

                // TODO: SHOW CUTSCENE?

                // TODO: CHANGE SPRITE
                player.loadTexture('player-armed');

                player.hasWeapon = true;
            }
        }
    }
}

// Enemy timing uses physics timer, which is in fractional seconds
function updateEnemies() {

    game.physics.arcade.overlap(weapon.bullets, thefeds, bulletEnemyCollisionHandler, null, this);

    // Handle enemy updates
    thefeds.nextSpawn -= game.time.physicsElapsed;
    if (thefeds.nextSpawn <= 0) {
        createEnemy();
        resetEnemySpawnTimer();
    }

    // The enemies have no AI - they just hone in on the player
    thefeds.forEach(function(item) {

        if (player.x < item.x) {
            item.x -= ENEMY_SPEED;
            item.scale.x = -1 * scaleFactor; // Flip sprite left
        } else if (player.x > item.x) {
            item.x += ENEMY_SPEED;
            item.scale.x = 1 * scaleFactor; // Unflip sprite
        }
        if (player.y < item.y) {
            item.y -= ENEMY_SPEED;
        } else if (player.y > item.y) {
            item.y += ENEMY_SPEED;
        }
    }, this);

    // Check for collisions between enemies and bullets

}

function createEnemy() {

    // TODO: Randomly create scientists

    // Randomly create a new enemy along the edge of the screen
    if (rnd(0,1)) {
        x = rnd(0,1);
        y = (rnd(0,100) * 0.01)
    } else {
        x = (rnd(0,100) * 0.01);
        y = rnd(0,1);
    }

    var enemy = thefeds.create(game.world.width * x, game.world.height * y, 'thefeds');
    enemy.anchor.setTo(0.5, 1);
    enemy.scale.x = scaleFactor;
    enemy.scale.y = scaleFactor;

    // Adjust the size of the player's bounding box
    enemy.body.setSize(32, 10, 4, 55);
}

function resetEnemySpawnTimer() {

    // Reset the enemy timer
    if (player.hasWeapon) {
        thefeds.nextSpawn = 1;
    } else {
        // The enemy spawn rate corresponds to the number of macguffins remaining before the character is armed
        thefeds.nextSpawn = numRemainingMacguffins() + 2;
    }
}

function bulletEnemyCollisionHandler(bullet, enemy) {

    // TODO: Sound
    // TODO: Death animation

    enemy.kill();
}


// Direction should be 0=up, 1=right ... clockwise
function changeScreen(from, direction)
{
    // This emulates the completely screwy map ET had ... so weird.
    map = {
        1: [4, 5, 2, 3], // Screen: [Destination Up, Right, Down, Left]
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

    // If we got holes, create rectangles for hit detection
    if (blueprints[screen].length) {
        for (var i = 0; i < blueprints[screen].length; i++) {
            var holeData = blueprints[screen][i];
            for (var j = 0; j < holeData.length; j++) {
                var b = holeData[j];
                holes.push(new Phaser.Rectangle(b[0] * scaleFactor, b[1] * scaleFactor, b[2] * scaleFactor, b[3] * scaleFactor));
            }
        }
    }

    // Show the macguffinSpot
    if (screenHasMacguffin(screen)) {
        var screenKey = getScreenKey(screen);
        var holeIdx = macguffinLocations[screenKey];
        var rect = blueprints[screen][holeIdx][0];
        macguffinSpot.x = (rect[0] + rect[2] * 0.5) * scaleFactor;
        macguffinSpot.y = (rect[1] + rect[3] * 0.5) * scaleFactor;
    }

    // Kill all the bullets flying around the current screen
    weapon.killAll();

    // Remove all enemies from the screen to respawn later
    thefeds.removeAll();

    resetEnemySpawnTimer();
}

function getScreenKey(screen) {
    return 'screen' + screen;
}

function screenHasMacguffin(screen) {
    return (getScreenKey(screen) in macguffinLocations);
}

function numRemainingMacguffins() {
    return Object.keys(macguffinLocations).length;
}

// This loops through the active holes and checks to see if the player's collision body is touching them
// If this returns null, a hole isn't touched
// If this returns -1, a non-macguffin hole is touched
// If this returns a positive number, a macguffin hole is touched
function playerTouchingHoleIdx() {

    var boundsA = player.body;

    for (var i = 0; i < holes.length; i++) {
        if (Phaser.Rectangle.intersects(boundsA, holes[i])) {

            // Once we figure out that a collision is happening, we want to return the index of the hole being touched
            for (var holeIdx = 0; holeIdx < blueprints[screen].length; holeIdx++) {
                var holeData = blueprints[screen][holeIdx];
                for (var j = 0; j < holeData.length; j++) {
                    var b = holeData[j];
                    var rect = new Phaser.Rectangle(b[0] * scaleFactor, b[1] * scaleFactor, b[2] * scaleFactor, b[3] * scaleFactor);
                    if (Phaser.Rectangle.intersects(rect, holes[i])) {
                        return holeIdx;
                    }
                }
            }
            
            return -1;
        }
    }

    return null;
}

function isPlayerTouchingMacguffin() {
    return macguffinSprite.visible && Phaser.Rectangle.intersects(player.body, macguffinSprite.body);
}

// This is used to debug things in the game - collision, etc.
function render() {

    // game.debug.bodyInfo(player, 32, 32);

    // weapon.debug(100, 100, true);

    /*
    thefeds.forEach(function(item) {
        game.debug.body(item);
    });
    */

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

    /*
    // Draw the first rectangle in each hole for testing
    // (This was used to verify that the first hole data was a valid position for our macguffin indicator)
    for (var i = 0; i < blueprints[screen].length; i++) {
        var holeData = blueprints[screen][i];
        var b = holeData[0];
        game.debug.geom(new Phaser.Rectangle(b[0] * scaleFactor, b[1] * scaleFactor, b[2] * scaleFactor, b[3] * scaleFactor), '#0fffff44');
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
    macguffinSpot.visible = false;
}

// Returns the rightmost characters in a string
function right(str, chr) {
    return newstr = str.substr(str.length - chr, str.length);
}

// Returns an integer random number within our min/max range
function rnd(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

// BlueprintsEx tell us where the holes are.
// There are multiple arrays within each blueprint.
// - The key tells us the screen number
// - The second level is the list of holes in that screen
// - The third level is the list of rectangles that make up that hole's hitboxes
// - The fourth level(!) is [x, y, width, height, mirroring]
// Blueprints is basically the same, but with the mirroring all worked
function setupBlueprints() {

    var blueprintsEx = {
        1: [],
        2: [[[90,258,158,7,'x'], [112,253,113,18,'x'], [158,247,21,29,'x']], [[135,112,45,29,'x'], [180,96,90,11,'x'], [157,107,91,5,'x'],[90,124,90,6,'x'],[135,135,90,6,'x'],[157,140,91,7,'x'],[180,146,91,12,'x']]],
        3: [[[157,67,45,57,'xy'], [135,73,90,45,'xy'], [113,78,135,35,'xy'],[90,84,180,23,'xy'],[68,90,225,11,'xy']]],
        4: [[[90,152,113,67,'x'],[113,107,67,158,'x'],[135,79,22,214,'x']], [[337,95,45,40,'y'],[314,101,90,28,'y'],[292,107,136,17,'y']]],
        5: [[[0,50,45,41,'xy'],[0,56,91,28,'xy'],[0,62,113,17,'xy']],[[158,163,44,45,'x'],[135,169,90,34,'x'],[113,174,135,23,'x'],[90,180,180,11,'x']],[[314,50,90,40,'y'],[270,56,180,28,'y'],[248,62,225,17,'y']]],
        6: []
    }

    // Extrapolate the blueprints
    var blueprints = {};
    for (var screen = 1; screen <= 6; screen++) {

        blueprints[screen] = [];

        for (var holeIdx = 0; holeIdx < blueprintsEx[screen].length; holeIdx++) {
        
            var holeBlueprint = blueprintsEx[screen][holeIdx];

            var newHole = [];
            var newHoleX = null;
            var newHoleY = null;
            var newHoleXY = null;

            for (var j = 0; j < holeBlueprint.length; j++) {

                var newHoleData = holeBlueprint[j];
                newHole.push(newHoleData);

                if (newHoleData.length >= 5) {
                    
                    // We have to do some funky-looking math because the hit detection doesn't work with rectangles with negative widths/heights
                    var mirrorX = ((gameWidth * 0.5) - newHoleData[0]) * 2 - newHoleData[2];
                    var mirrorY = ((gameHeight * 0.5)  - newHoleData[1]) * 2 - newHoleData[3];

                    if (newHoleData[4].indexOf('x') > -1) {
                        var rect = [mirrorX +  newHoleData[0], newHoleData[1], newHoleData[2], newHoleData[3]];
                        if (newHoleX == null) { newHoleX = []; }
                        newHoleX.push(rect);
                    }
                    if (newHoleData[4].indexOf('y') > -1) {
                        var rect = [newHoleData[0], mirrorY + newHoleData[1], newHoleData[2], newHoleData[3]];
                        if (newHoleY == null) { newHoleY = []; }
                        newHoleY.push(rect);
                    }
                    if (newHoleData[4].indexOf('xy') > -1) {
                        var rect = [mirrorX + newHoleData[0], mirrorY + newHoleData[1], newHoleData[2], newHoleData[3]];
                        if (newHoleXY == null) { newHoleXY = []; }
                        newHoleXY.push(rect);
                    }
                }
            }

            // Add all the hole data to the blueprints now that all the rectangles are collected and mirrored
            blueprints[screen].push(newHole);
            if (newHoleX != null) blueprints[screen].push(newHoleX);
            if (newHoleY != null) blueprints[screen].push(newHoleY);
            if (newHoleXY != null) blueprints[screen].push(newHoleXY);
        }
    }
    return blueprints;
}

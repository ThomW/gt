/*

G.T. by ThomW

Apologies to everyone who plays this

*/
var gameWidth = 720;
var gameHeight = 372;

scaleFactor = 1;

var game = new Phaser.Game(gameWidth * scaleFactor, gameHeight * scaleFactor, Phaser.AUTO, 'game', { preload: preload, create: create, update: update, render: render });

var soundNames = ['walk', 'enemy_hit', 'laser'];

function preload () {

   // Needed to combat content caching
   var imgFolder = 'img/';

   var imgNames = ['font', 'macguffin1', 'macguffin2', 'macguffin3', 'title-title', 'title-subtitle', 'title-finger', 'help', 'help-hole', 'help-shooting', 'help-macguffin', 'ship', 'ship-lights', 'ship-ramp', 'earth', 'boom'];
   for (var i = 0; i < imgNames.length; i++) {
      game.load.image(imgNames[i], imgFolder + imgNames[i] + '.png');
   }

   var imgNames = ['bg-01', 'bg-02', 'bg-03', 'bg-04', 'bg-05', 'bg-06', 'bg-07', 'title-bg', 'space'];
   for (var i = 0; i < imgNames.length; i++) {
      game.load.image(imgNames[i], imgFolder + imgNames[i] + '.jpg');
   }

   game.load.spritesheet('player', 'img/player.png', 42, 64, 7);
   game.load.spritesheet('player-armed', 'img/player-armed.png', 42, 64, 7);
   game.load.spritesheet('ping', 'img/ping.png', 15, 15, 3);
   game.load.spritesheet('bullet', 'img/bullet.png', 17, 15, 4);
   game.load.spritesheet('thefeds', 'img/thefeds.png', 40, 60);
   game.load.spritesheet('corpse', 'img/corpse.png', 40, 60);
   game.load.spritesheet('captured', 'img/player-captured.png', 40, 60, 4);

   this.load.spritesheet('gamepad', 'gamepad/gamepad_spritesheet.png', 100, 100);

   // Load audio
   for (var i = 0; i < soundNames.length; i++) {
    game.load.audio(soundNames[i], 'audio/' + soundNames[i] + '.ogg');

   }

   /*
   if (game.device.desktop) {
      game.load.spritesheet('gameover', imgFolder + 'game-over.png', 734, 46);
   } else {
      game.load.spritesheet('gameover', imgFolder + 'game-over-mobile.png', 627, 46);
   }
   */

   // resizeApp();
}


var GAME_STATE_BUSY = 0;
var GAME_STATE_TITLE = 1;
var GAME_STATE_INTRO = 2; // This is the starting 'cutscene'
var GAME_STATE_PLAYING = 3;
var GAME_STATE_NECKUP = 5; // This is a special case where the player is in the overworld, but doing the neck thing
var GAME_STATE_PLAYER_IN_HOLE = 4;
var GAME_STATE_END_GAME = 15;
var GAME_STATE_GAME_OVER = 16;
var GAME_STATE_PLAYER_CAPTURED = 17;
var GAME_STATE_OUTRO = 666;

var HOLE_FLOOR = 322 * scaleFactor;

var gameState = GAME_STATE_TITLE;

var background;
var titleTitle, titleFinger;
var player;

var score = 0;

var helpSprite = null;

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

var sounds = {};

var movestick = null;
var fireButtons = [];


function introStart() {

    // Remove start handlers
    game.input.keyboard.reset();
    game.input.onDown.removeAll();

    titleTitle.visible = false;
    titleSubtitle.visible = false;
    titleFinger.visible = false;

    gameState = GAME_STATE_INTRO;

    // TODO: Add the spaceship sprite

    // Drop the player into the scene
    player.visible = true;
    introTween = game.add.tween(player).to( { y: game.world.centerY }, 200, Phaser.Easing.Linear.None, true);
    introTween.onComplete.add(gameStart, this);
    
    screen = 1;
    background.loadTexture('bg-01');

    console.log('hi');
    helpSprite.visible = true;
}

function gameover2() {

  background.loadTexture('space');

  earthSprite.visible = true;
  earthSprite.x = game.world.width * 0.75;
  earthSprite.y = game.world.height * 0.75;

  shipRampSprite.visible = false;

  shipSprite.bringToTop();
  shipSprite.scale.setTo(0, 0);
  shipSprite.visible = true;
  shipSprite.x = earthSprite.x;
  shipSprite.y = earthSprite.y;
  shipSprite.rotation = 5.4;

  var shipSpeed = 6000;
  tweenScale = game.add.tween(shipSprite.scale).to({ x: 2, y: 2}, shipSpeed);
  tweenFly = game.add.tween(shipSprite).to({ x: 0, y: 0}, shipSpeed);

  tweenScale.start();
  tweenFly.start();

  // TODO: Blow up the earth ... lol

  // Fade the earth out over eight seconds
  var earthFade = game.add.tween(earthSprite).to({alpha: 0}, 9000);
  earthFade.start();

  for (var i = 0; i < 30; i++) {

    boom = game.add.sprite(earthSprite.x, earthSprite.y, 'boom');
    boom.scale.setTo(0, 0);
    boom.alpha = 0;
    boom.anchor.setTo(0.5, 0.5);

    // This finds a point on a ray shot out from the middle of the earth at angle (a)
    // with the hypotenuse (h)
    var a = rnd(0, 359);
    var h = rnd(0, 70 * scaleFactor);
    boom.x = earthSprite.x + h * Math.cos(a);
    boom.y = earthSprite.y + h * Math.sin(a);

    var tgt = rnd(scaleFactor, scaleFactor * 3);
    var speed = rnd(250, 2000);
    var boom1 = game.add.tween(boom.scale).to({ x: tgt, y: tgt }, speed);
    var boom2 = game.add.tween(boom).to({ alpha: 0.9 }, speed);
    var boom3 = game.add.tween(boom).to({ alpha: 0 }, 50);
    
    boom2.chain(boom3);

    var delay = rnd(0, 2000);
    boom1.delay(delay);
    boom2.delay(delay);

    var reps = rnd(1, 4);
    boom1.repeat(reps);
    boom2.repeat(reps);

    boom1.start();
    boom2.start();
  }
}

// Stops playing all sounds
function killSounds() {

  for (var key in sounds) {
    sounds[key].stop();
  }

}

function gameover() { 

  gameState = GAME_STATE_OUTRO;

  // Kill all sounds
  killSounds();

  // Hide the onscreen controls
  game.add.tween(movestick).to( { alpha: 0 }, 500, "Linear", true);
  for (var i = 0; i < 5; i++) {
    game.add.tween(fireButtons[i]).to( { alpha: 0 }, 500, "Linear", true);
  }

  // Dim background

  // Fix the z-order
  game.world.bringToTop(player);
  game.world.bringToTop(shipLightsSprite);

  // Init objects needed by ending
  shipSprite.visible = true;
  shipRampSprite.height = 0;
  shipRampSprite.visible = true;

  // Setup all the tweens to land the ship, lower the ramp, load the player, raise the ramp, and take off
  tweenShipLand = game.add.tween(shipSprite).to({ y: game.height }, 2000);
  tweenRampDown = game.add.tween(shipRampSprite).to({ height: 122 }, 1000);
  tweenPlayerInShip = game.add.tween(player).to({ y: 280 * scaleFactor, alpha: 0.5 }, 1000);
  tweenPlayerFade = game.add.tween(player).to({ alpha: 0 }, 600);
  tweenRampUp = game.add.tween(shipRampSprite).to({ height: 0 }, 1000);
  tweenShipLaunch = game.add.tween(shipSprite).to({ y: 0 }, 1000);

  tweenShipLaunch.onComplete.add(function() {
    gameover2();
  });

  // Chain all our tweens
  tweenShipLand.chain(tweenRampDown);
  tweenRampDown.chain(tweenPlayerInShip);
  tweenPlayerInShip.chain(tweenPlayerFade);
  
  tweenPlayerFade.chain(tweenRampUp);
  tweenRampUp.chain(tweenShipLaunch);

  /*
  // FOR DEBUG
  // Randomly create a new enemy along the edge of the screen
  for (var i = 0; i < 109; i++ ) {

    var x = game.world.width * (rnd(0,100) * 0.01);
    var y = game.world.height * (rnd(0,100) * 0.01);

    console.log(x + ',' + y);

    var enemy = thefeds.create(x, y, 'thefeds');

    enemy.x = x;
    enemy.y = y;

    enemy.anchor.setTo(0.5, 1);
    enemy.scale.x = scaleFactor;
    enemy.scale.y = scaleFactor;
    enemy.animations.add('walk', [0,1], 5, true);
    enemy.animations.play('walk');
    enemy.body.setSize(32, 10, 4, 55);
  }
  */

  // Enemies stop moving - look toward center
  thefeds.forEach(function(item) {

    // Stop enemy's movement
    item.reset();

    // Make sure the enemies are all facing the middle of the screen
    if (item.x < game.world.centerX) {
      item.scale.x = scaleFactor;
    } else { 
      item.scale.x = -scaleFactor;
    }

    // Move them all to somewhere in the lower first and third thirds
    var tween;
    if (item.x < game.world.centerX) {
      tween = game.add.tween(item).to({x: rnd(20, game.world.width * 0.33), y: rnd(game.world.height * 0.8, game.world.height)}, 1000).start();
    } else {
      tween = game.add.tween(item).to({x: rnd(game.world.width * 0.66, game.world.width), y: rnd(game.world.height * 0.8, game.world.height)}, 1000).start();
    }

    // Stop their walk animations so they don't look like they're peeing their pants
    tween.onComplete.add(function() {
      item.animations.stop(null, true);
    });
  

  });

  // Player moves to bottom middle of screen
  game.add.tween(player).to({ x: game.world.width * 0.5, y: game.world.height}, 1000).start();

  // Start the animation
  tweenShipLand.start();

  // Scroll background up?
 
}

// I need this function at the start of the game, and everytime the player get captured
function resetMacguffins() {

  // Hide all the Macguffin captured icons
  for (var i =0; i < 3; i++) {
    macguffinImages[i].visible = false;
  }

  // Randomize the macguffins' locations
  // Screens 2-5 are the screens with holes
  while (Object.keys(macguffinLocations).length < 3) {
    var screenIdx = rnd(2, 5);
    var holeIdx = rnd(0, blueprints[screenIdx].length - 1);
    macguffinLocations[getScreenKey(screenIdx)] = holeIdx; // Hack to force array to be associative
  }
}

function gameStart() {

  // Reset the location of the hidden objects
  resetMacguffins();

  // Set gamestate to start the update() loop logic
  gameState = GAME_STATE_PLAYING;
}


function create() {

    // Set scale mode to SHOW_ALL
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.forceOrientation(true);
  
    sounds['walk'] = new Phaser.Sound(game,'walk', 1, true);
    sounds['enemy_hit'] = new Phaser.Sound(game, 'enemy_hit', 1, false);
    sounds['laser'] = new Phaser.Sound(game, 'laser', 1, false);

    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.physics.setBoundsToWorld();

    //  We check bounds collisions against all walls other than the bottom one
    game.physics.arcade.checkCollision.down = false;

    background = game.add.sprite(0, 0, 'title-bg');
    background.scale.setTo(scaleFactor, scaleFactor);
    background.alpha = 0;

    titleFinger = game.add.sprite(0, 0, 'title-finger');
    titleFinger.scale.setTo(scaleFactor, scaleFactor);
    titleFinger.anchor.setTo(0.5, 1);
    titleFinger.x = game.width * 0.5;
    titleFinger.y = game.height + titleFinger.height + 100;
    
    titleTitle = game.add.sprite(0, 0, 'title-title');
    titleTitle.scale.setTo(scaleFactor, scaleFactor);
    titleTitle.alpha = 0;
    titleTitle.anchor.setTo(0.5, 1);
    titleTitle.x = game.width * 0.5;
    titleTitle.y = game.height - 15 * scaleFactor;

    titleSubtitle = game.add.sprite(0, 0, 'title-subtitle');
    titleSubtitle.scale.setTo(scaleFactor, scaleFactor);
    titleSubtitle.alpha = 0;
    titleSubtitle.anchor.setTo(0.5, 1);
    titleSubtitle.x = game.width * 0.5;
    titleSubtitle.y = game.height - 2 * scaleFactor;

    player = game.add.sprite(game.world.centerX, 0, 'player');
    player.scale.setTo(scaleFactor, scaleFactor);
    player.anchor.setTo(0.5, 1);
    game.physics.enable(player, Phaser.Physics.ARCADE);
    player.body.setSize(32, 10, 4, 55); // Adjust the size of the player's bounding box
    player.visible = false;

    // Setup some variables I'm glomming onto the player object
    player.isHovering = false;
    player.numCandies = 0;
    player.hasWeapon = false;
    player.shownHoleTutorial = false;
    player.shownWeaponTutorial = false;
    player.shownMacguffinTutorial = false;
    player.deathtoll = 0;
    player.isInHole = false;

    var walkAnim = player.animations.add('walk', [0, 1, 2], 10, true);
    walkAnim.onStart.add(function() {
      sounds['walk'].play();
    });

    animations['neckup'] = player.animations.add('neckup', [3, 4, 5, 6], 10, false);
    animations['neckup'].onStart.add(function() {
      sounds['walk'].stop();
    });

    // The neckdown animation has a 
    animations['neckdown'] = player.animations.add('neckdown', [6, 5, 4, 3, 0], 10, false);
    animations['neckdown'].onComplete.add(onNeckdownComplete, this);

    //  Creates 30 bullets, using the 'bullet' graphic
    weapon = game.add.weapon(30, 'bullet');
    weapon.bullets.setAll('scale.x', scaleFactor);
    weapon.bullets.setAll('scale.y', scaleFactor);
    weapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS;
    weapon.bulletSpeed = 900; //  The speed at which the bullet is fired
    weapon.fireRate = 150; // Delay between bullets in ms
    weapon.trackSprite(player, 0, -40 * scaleFactor); // Position toward player's head
    weapon.setBulletBodyOffset(4 * scaleFactor, 4 * scaleFactor, 0, 44);
    weapon.setBulletFrames(0, 3, false);
    weapon.bulletInheritSpriteSpeed = false;
    weapon.addBulletAnimation('bulletUp', [2], 0, false);
    weapon.addBulletAnimation('bulletRight', [1], 0, false);
    weapon.addBulletAnimation('bulletDown', [0], 0, false);
    weapon.addBulletAnimation('bulletLeft', [3], 0, false);
    weapon.onFire.add(function() {
      sounds['laser'].play();
    })

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

    corpses = game.add.group();
    corpses.createMultiple(30, 'corpse');
    corpses.forEach(setupCorpse, this);

    scoreText = game.add.retroFont('font', 15, 7, '0123456789', 10);
    scoreImg = game.add.image(160 * scaleFactor, 175 * scaleFactor, scoreText);
    scoreImg.scale.setTo(scaleFactor, scaleFactor);
    scoreImg.anchor.setTo(0.5, 0.5);
    hideScore();

    helpSprite = game.add.sprite(0,0,'help');
    helpSprite.scale.setTo(scaleFactor, scaleFactor);
    helpSprite.anchor.setTo(0.5, 1);
    helpSprite.x = Math.round(game.world.centerX);
    helpSprite.y = game.world.height - 15 * scaleFactor;
    helpSprite.visible = false;

    shipSprite = game.add.sprite(0, 0,'ship');
    shipSprite.scale.setTo(scaleFactor, scaleFactor);
    shipSprite.anchor.setTo(0.5, 1);
    shipSprite.x = Math.round(game.world.centerX);
    shipSprite.y = 0;
    shipSprite.visible = false;

    shipRampSprite = game.add.sprite(0, 0,'ship-ramp');
    shipRampSprite.anchor.setTo(0.5, 0);
    shipRampSprite.x = 0;
    shipRampSprite.y = -122; // Relative to the parent ship
    shipSprite.addChild(shipRampSprite);

    shipLightsSprite = game.add.sprite(0, 0,'ship-lights');
    shipLightsSprite.anchor.setTo(0.5, 1);
    shipLightsSprite.x = 0;
    shipLightsSprite.y = 0;
    shipLightsSprite.alpha = 0.8;
    game.add.tween(shipLightsSprite).to( { alpha: 1 }, 200, Phaser.Easing.Linear.None, true, 0, 200, true);
    shipSprite.addChild(shipLightsSprite);

    earthSprite = game.add.sprite(0, 0, 'earth');
    earthSprite.scale.setTo(scaleFactor, scaleFactor);
    earthSprite.anchor.setTo(0.5, 0.5);
    earthSprite.x = game.world.width * 0.75;
    earthSprite.y = game.world.height * 0.25;
    earthSprite.visible = false;

    // Setup the Macguffin status display
    for (var i = 1; i <= 3; i++) {
        var macguffinImg = game.add.sprite(10 * scaleFactor + 40 * i * scaleFactor, 10 * scaleFactor, 'macguffin' + i);
        macguffinImg.scale.setTo(scaleFactor, scaleFactor);
        macguffinImg.visible = false;
        macguffinImages.push(macguffinImg);
    }

    gameState = GAME_STATE_TITLE;

    // Setup the tweens for the title screen
    tweenBackground = game.add.tween(background).to( { alpha: 1 }, 500);
    tweenFinger = game.add.tween(titleFinger).to( { y: game.height }, 1500, Phaser.Easing.Linear.None);
    tweenTitle = game.add.tween(titleTitle).to( { alpha: 1 }, 1000);
    tweenSubtitle = game.add.tween(titleSubtitle).to( { alpha: 1 }, 500);
    
    tweenBackground.chain(tweenFinger);
    tweenFinger.chain(tweenTitle);
    tweenTitle.chain(tweenSubtitle);

    tweenBackground.start();

    tweenSubtitle.onComplete.add(function() {
        game.input.onDown.addOnce(introStart, this);
        game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onDown.add(introStart, this);
    }, this);

    // FOR DEBUG
    // game.input.onDown.addOnce(introStart, this);

    // Device has a touchscreen, so show the on-screen controls
    if (game.device.touch) {

        // Add the VirtualGamepad plugin to the game
        gamepad = game.plugins.add(Phaser.Plugin.VirtualGamepad);
        
        // Add a joystick to the game (only one is allowed right now)
        movestick = gamepad.addJoystick(game.width * 0.15, game.height * 0.75, 1.2, 'gamepad');

        // Add fire buttons and create isDown property with handlers

        var BUTTON_CENTER_X = game.width - 175;
        var BUTTON_CENTER_Y = game.height - 175;
        var BUTTON_DIFF = 66;

        var buttonPos = [
              [BUTTON_CENTER_X , BUTTON_CENTER_Y - BUTTON_DIFF, false] // x, y, visible
            , [BUTTON_CENTER_X + BUTTON_DIFF, BUTTON_CENTER_Y, false]
            , [BUTTON_CENTER_X, BUTTON_CENTER_Y + BUTTON_DIFF, false]
            , [BUTTON_CENTER_X - BUTTON_DIFF, BUTTON_CENTER_Y, false]
            , [game.width * 0.85, game.height * 0.1, true] // This is the 'action' button
        ];
        for (var i = 0; i < buttonPos.length; i++) {
            fireButtons[i] = game.add.button(buttonPos[i][0], buttonPos[i][1], 'gamepad', null, this, 0, 0, 1, 0);
            fireButtons[i].visible = buttonPos[i][2];
            fireButtons[i].onInputDown.add(onButtonDownHandler, this);
            fireButtons[i].onInputUp.add(onButtonUpHandler, this);
            fireButtons[i].isDown = false;
        }

    } else {

        // Setup fake joystick and buttons so that I don't need to 
        // create a bunch of branching to keep the game from exploding
        // if the touchscreen controls aren't initialized

        movestick = {
            alpha: 0,
            visible: false,
            properties: {
                up: false,
                right: false,
                down: false,
                left: false
            }
        }

        for (var i = 0; i < 5; i++) {
            fireButtons[i] = [];
            fireButtons[i]['isDown'] = false;
            fireButtons[i]['visible'] = false;
            fireButtons[i]['alpha'] = 0;
        }
    }
}

function onButtonDownHandler(obj) { obj.isDown = true; }
function onButtonUpHandler(obj) { obj.isDown = false; }

var WALKING_SPEED = 3 * scaleFactor;
var ENEMY_SPEED = 125 * scaleFactor;

function update () {

    if (gameState == GAME_STATE_PLAYING) {

        // This sucks, but it does fix the problem we'd have if the player had both A and D held (for instance)
        var startingPos = player.x + ',' + player.y;

        if (game.input.keyboard.isDown(Phaser.Keyboard.A) || movestick.properties.left) {
            player.x -= WALKING_SPEED;
            player.scale.x = -1 * scaleFactor; // Flip sprite left
        } 
        if (game.input.keyboard.isDown(Phaser.Keyboard.D) || movestick.properties.right) {
            player.x += WALKING_SPEED;
            player.scale.x = scaleFactor; // Flip sprite right
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.W) || movestick.properties.up) {
            player.y -= WALKING_SPEED;
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.S) || movestick.properties.down) {
            player.y += WALKING_SPEED;
        }

        if (player.isHovering && !game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) && !fireButtons[4].isDown) {
            player.animations.play('neckdown');
        }

        var finalPos = player.x + ',' + player.y;

        if (!player.isHovering) {
            if (startingPos != finalPos) {
                player.animations.play('walk');
            } else {
                sounds['walk'].stop();
                player.animations.stop();
                player.frame = 0; // Plant the player's feet
            }
        }

        // Fire weapon?
        if (player.hasWeapon) {

            var FIRE_UP = 1, FIRE_RIGHT = 2, FIRE_DOWN = 4, FIRE_LEFT = 8;

            // This craziness is the laziest way I could think of to make sure that only one fire button is hit at a time
            var fireDir = 0;
            if (game.input.keyboard.isDown(Phaser.Keyboard.I) || fireButtons[0].isDown) { fireDir += FIRE_UP; }
            if (game.input.keyboard.isDown(Phaser.Keyboard.L) || fireButtons[1].isDown) { fireDir += FIRE_RIGHT; }
            if (game.input.keyboard.isDown(Phaser.Keyboard.K) || fireButtons[2].isDown) { fireDir += FIRE_DOWN; }
            if (game.input.keyboard.isDown(Phaser.Keyboard.J) || fireButtons[3].isDown) { fireDir += FIRE_LEFT; }

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
        if (!player.isHovering && startingPos == finalPos && (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) || fireButtons[4].isDown)) {
            gameState = GAME_STATE_NECKUP;
            player.animations.play('neckup');
        }

      }

      // Handle screen change
      if (gameState == GAME_STATE_PLAYING || gameState == GAME_STATE_PLAYER_CAPTURED) {

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

      }
      
      if (gameState == GAME_STATE_PLAYING) {

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

                // Stop walking sound
                killSounds();

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

                // Show the hole help if it's the player's first time in a hole
                if (!player.shownHoleTutorial) {
                  helpSprite.loadTexture('help-hole');
                  helpSprite.visible = true;
                  player.shownHoleTutorial = true;
                }
            }
        }

        updateEnemies();

    }
    else if (gameState == GAME_STATE_NECKUP) {

        // The player can't move, and all we're really looking for is the spacebar to be released
        if (!game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) && !fireButtons[4].isDown) {
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

        player.isInHole = true;

        // This sucks, but it does fix the problem we'd have if the player had both A and D held (for instance)
        var startingPos = player.x;

        var playerIsOnGround = false;

        if (game.input.keyboard.isDown(Phaser.Keyboard.A) || movestick.properties.left) {
            player.x -= WALKING_SPEED;
            player.scale.x = -1 * scaleFactor; // Flip sprite left
        } 
        if (game.input.keyboard.isDown(Phaser.Keyboard.D) || movestick.properties.right) {
            player.x += WALKING_SPEED;
            player.scale.x = scaleFactor; // Flip sprite right
        }

        if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) || fireButtons[4].isDown) {

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

            player.isInHole = false;

            // GTFO of the stupid hole
            gameState = GAME_STATE_PLAYING;

            player.x = lastPosition[0];
            player.y = lastPosition[1];

            background.loadTexture('bg-0' + lastScreen);

            macguffinSprite.visible = false;

            // This is the first time the player has been above ground after getting the weapon
            if (player.hasWeapon && !player.shownWeaponTutorial) {
              player.shownWeaponTutorial = true;
              helpSprite.loadTexture('help-shooting');
              helpSprite.visible = true;
            }
            // Hide the hole sprite sinc it's not needed anymore
            else {
              helpSprite.visible = false;
            }

        } else if (player.y >= HOLE_FLOOR) { 

            // Prevents player from falling through floor of hole
            player.y = HOLE_FLOOR;

            playerIsOnGround = true;
        }

        var finalPos = player.x;

        // Only update walking animation when the player is standing on the ground
        if (!player.isHovering && playerIsOnGround) {
            if (startingPos != finalPos) {
                player.animations.play('walk');
            } else {
                sounds['walk'].stop();
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

                // Show the on-screen controls
                for (var i = 0; i < 4; i++) {
                    fireButtons[i].alpha = 0;
                    fireButtons[i].visible = true;
                    game.add.tween(fireButtons[i]).to( { alpha: 1 }, 1000, "Linear", true);
                }

                // Change player's sprite
                player.loadTexture('player-armed');

                player.hasWeapon = true;
            }
        }
    } 
    
    if (gameState == GAME_STATE_PLAYER_CAPTURED) {

      // Move the player to the feds' home
      if (screen == 6) {

        // This is the fbi building position
        var tgt = new Phaser.Rectangle(167 * scaleFactor, 115 * scaleFactor, 10, 10);

        // Handle the movement
        var radians = game.physics.arcade.angleBetween(player, tgt);
        degrees = radians * (180 / Math.PI);

        game.physics.arcade.velocityFromAngle(degrees, ENEMY_SPEED, player.body.velocity);

        if (Phaser.Rectangle.intersects(player.body, tgt)) {

          // Change the player texture back to the default
          player.loadTexture('player');

          // This resets the player position, which resets its velocity to undo the effect of the velocityFromAngle above - zeroing velocity broke player capture forever
          player.reset(player.x, player.y);

          // Return the game state to playing
          gameState = GAME_STATE_PLAYING;
          
          return;
        }

      } else {

        // Move down until we arrive at screen 6
        game.physics.arcade.velocityFromAngle(90, ENEMY_SPEED, player.body.velocity);
      }
  }
}

// This is the code that's called when the player is captured by an enemy
function playerEnemyCollsionHandler(player, enemy) {

    gameState = GAME_STATE_PLAYER_CAPTURED;

    // TODO: Sound

    // Reset the player flags when captured
    player.deathtoll = 0;
    player.hasWeapon = false;

    // Steal all the macguffins from the player
    resetMacguffins();

    // Hide the on-screen directional firebuttons
    for (var i = 0; i < 4; i++) {
        game.add.tween(fireButtons[i]).to( { alpha: 0 }, 500, "Linear", true);
    }
    
    player.loadTexture('captured');

    // Remove the enemy - they're no longer needed
    enemy.kill();
}

// Enemy timing uses physics timer, which is in fractional seconds
function updateEnemies() {

    game.physics.arcade.overlap(weapon.bullets, thefeds, bulletEnemyCollisionHandler, null, this);

    game.physics.arcade.overlap(player, thefeds, playerEnemyCollsionHandler, null, this);

    // Handle enemy updates
    thefeds.nextSpawn -= game.time.physicsElapsed;
    if (thefeds.nextSpawn <= 0) {
        createEnemy();
        resetEnemySpawnTimer();
    }

    // The enemies have no AI - they just hone in on the player
    thefeds.forEach(function(item) {

      // Chase the player around
      radians = game.physics.arcade.angleBetween(item, player);
      degrees = radians * (180 / Math.PI);
      game.physics.arcade.velocityFromAngle(degrees, ENEMY_SPEED, item.body.velocity);

      // Flip the enemy sprite when it makes sense
      if (Math.abs(degrees) > 90) {
        item.scale.x = -scaleFactor;
      } else {
        item.scale.x = scaleFactor;
      }
    }, this);
}

function setupCorpse(corpse) {
  corpse.anchor.setTo(0.5, 1);
  corpse.animations.add('corpse', [0, 0, 0, 1, 2, 3, 4], 5, false);
}

function createEnemy() {

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

    enemy.animations.add('walk', [0,1], 5, true);
    enemy.animations.play('walk');

    // Adjust the size of the player's bounding box
    enemy.body.setSize(32, 10, 4, 50);
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

    sounds['enemy_hit'].play();

    // Spawn a corpse
    var corpse = corpses.getFirstExists(false, true);
    corpse.reset(enemy.x, enemy.y);

    // Match the enemy's scale - mainly for flipping the sprite the correct direction
    corpse.scale.y = enemy.scale.y;
    corpse.scale.x = enemy.scale.x;

    // (animation_name, frame_rate, loop, killOnComplete)
    corpse.play('corpse', 15, false, true);

    // Remove the enemy from the collection and erase all trace of them
    enemy.destroy();

    // Increment deathtoll when the player is in the forest
    if (screen == 1) {

      player.deathtoll += 1;

      // Once the player has killed X enemies and reached the forest, play the gameover scene
      if (player.deathtoll > 20) {
        gameover();
      }
    }
}


// Direction should be 0=up, 1=right ... clockwise
function changeScreen(from, direction)
{
    // Hide the macguffin indicator
    macguffinSpot.visible = false;

    // Hide the help text
    helpSprite.visible = false;

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

        if (!player.shownMacguffinTutorial) {
          player.shownMacguffinTutorial = true;
          helpSprite.loadTexture('help-macguffin');
          helpSprite.visible = true;
        }
    }

    // Kill all the bullets flying around the current screen
    weapon.killAll();

    // Hide all the enemies and reset their spawn timer
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

    // This is the worst hack in this game. Holy ouch. :P
    if (player.isInHole) {
        gameState = GAME_STATE_PLAYER_IN_HOLE;
    } else {
        gameState = GAME_STATE_PLAYING;
    }
    
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

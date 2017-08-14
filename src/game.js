var game = new Phaser.Game(800,600,Phaser.AUTO,'container_id');

var oPlayState = game.state.add('play',{
	preload: function(){
		this.SupportFunctions.PreloadImages(this.SupportData.arrBackgroundImageData,'assets/parallax_forest_pack/layers/');
		this.SupportFunctions.PreloadImages(this.SupportData.arrMonsterImageData,'assets/allacrost_enemy_sprites/');
		this.SupportFunctions.PreloadImages(this.SupportData.arrItemImageData, 'assets/496_RPG_icons/')
		this.game.cache.addBitmapData('upgradePanel', this.SupportFunctions.CreateUpgradePanelBitmap());
		this.game.cache.addBitmapData('button', this.SupportFunctions.CreateButtonBitmap());

		this.level = 1;	// world progression
		this.levelKills = 0	// how many many monsters have we killed during this level
		this.levelKillsRequired = 10;	// how many monsters are required to advance a level
	},
	create: function(){
		var state = this;
		this.background = this.SupportFunctions.BuildBackgroundGroup(this.SupportData.arrBackgroundImageData);

		this.monsters = this.SupportFunctions.BuildMonsterGroup(this.SupportData.arrMonsterData);
		[this.monsterInfoUI,this.monsterNameText,this.monsterHealthText] = this.SupportFunctions.BuildMonsterInfoUIGroup();
		this.damageTextPool = this.SupportFunctions.BuildDamageTextPool();
		this.currentMonster = this.SupportFunctions.ReviveNextMonster();
		this.player = {
			clickDamage: 5,
			gold: 100,
			dps: 0
		};
		this.coins = this.SupportFunctions.BuildCoinsGroup();
		this.playerGoldText = this.add.text(30, 30, 'Gold: ' + this.player.gold, {
            font: '24px Arial Black',
            fill: '#fff',
            strokeThickness: 4
        });

        this.upgradePanel = this.game.add.image(10,70, this.game.cache.getBitmapData('upgradePanel'));
		var upgradeButtons = this.upgradePanel.addChild(this.game.add.group());
		upgradeButtons.position.setTo(8,8);

        var button;
        this.SupportData.arrUpgradeButtonsData.forEach(function(buttonData, index){
			button = state.game.add.button(0,(50 * index),state.game.cache.getBitmapData('button'));
			button.icon = button.addChild(state.game.add.image(6,6,buttonData.icon));
			button.text = button.addChild(state.game.add.text(42,6, buttonData.name + ': ' + buttonData.level, {font: '16px Arial Black'}));
			button.details = buttonData;
			button.costText = button.addChild(state.game.add.text(42,24, 'Cost: ' + buttonData.cost, {font: '16px Arial Black'}));
			button.events.onInputDown.add(state.onUpgradeButtonClick, state);
			upgradeButtons.addChild(button);
        });

        // 100ms 10x a second
        this.dpsTimer = this.game.time.events.loop(100, this.onDPS, this);

        this.levelUI = this.game.add.group();
        this.levelUI.position.setTo(this.game.world.centerX, 30);
        this.levelText = this.levelUI.addChild(this.game.add.text(0,0,'Level: ' + this.level,{font: '24px Arial Black',fill:'#fff',strokeThickness:4}));
        this.levelKillsText = this.levelUI.addChild(this.game.add.text(0,30, 'Kills: ' + this.levelKills + '/' + this.levelKillsRequired,{font: '24px Arial Black',fill:'#fff',strokeThickness:4}))
	},
	onDPS: function(){
		if(this.player.dps>0){
			if(this.currentMonster && this.currentMonster.alive){
				var dmg = this.player.dps / 10;
				this.currentMonster.damage(dmg);
				// update the health text
				if (this.currentMonster.alive){
					this.monsterHealthText.text = Math.round(this.currentMonster.health) + ' HP';
				}else{
					this.monsterHealthText.text = 'DEAD';
				}
			}
		}
	},
	onUpgradeButtonClick: function(button, pointer){
		function getAdjustedCost(){
			return Math.ceil(button.details.cost + (button.details.level * 1.46));
		}

		if(this.player.gold - getAdjustedCost() >= 0){
			this.player.gold -= getAdjustedCost();
			this.playerGoldText.text = 'Gold: ' + this.player.gold;
			button.details.level++;
			button.text.text = button.details.name + ': ' + button.details.level;
			button.costText.text = 'Cost: ' + getAdjustedCost();
			button.details.purchaseHandler.call(this,button,this.player);
		}
	},
	onClickCoin: function(coin){
		if(coin.alive){
			this.player.gold += coin.goldValue; // give the player gold
			this.playerGoldText.text = 'Gold: ' + this.player.gold; // update UI
			coin.kill(); // remove the coin
		}
	},
    onClickMonster: function(monster, pointer){
    	this.currentMonster.damage(this.player.clickDamage);

    	if (this.currentMonster.alive){
    		this.monsterHealthText.text = Math.round(this.currentMonster.health) + ' HP';
    	}else{
    		this.monsterHealthText.text = 'DEAD';
    	}

    	// grab the damage text from the pool to display what happened
    	var damageText = this.damageTextPool.getFirstExists(false);
    	if(damageText){
    		damageText.text = this.player.clickDamage;
    		damageText.reset(pointer.positionDown.x,pointer.positionDown.y);
    		damageText.alpha = 1;
    		damageText.tween.start();
    	}

    },
    onKilledMonster: function(monster){
    	this.levelKills++;
    	if(this.levelKills >= this.levelKillsRequired){
    		this.level++;
    		this.levelKills = 0;
    	}
    	this.levelText.text = 'Level: ' + this.level;
    	this.levelKillsText.text = 'Kills: ' + this.levelKills + '/' + this.levelKillsRequired;
    	monster.position.set(1000,this.game.world.centerY); // move killed monster off-screen
    	this.currentMonster = this.SupportFunctions.ReviveNextMonster();

    	var coin;
    	coin = this.coins.getFirstExists(false);
    	if (coin){
			coin.reset(this.game.world.centerX + this.game.rnd.integerInRange(-100,100), this.game.world.centerY);
    		coin.goldValue = 1;
    		this.game.time.events.add(Phaser.Timer.SECOND * 3, this.onClickCoin, this, coin);
    	}

    },
    onRevivedMonster: function(monster){
    	var oMonsterSettings = this.SupportFunctions.GetMonsterSettings();
    	monster.position.set(oMonsterSettings.x, oMonsterSettings.y); // move monster on-screen
    	// update monster text
    	this.monsterNameText.text = monster.details.name;
    	this.monsterHealthText.text = monster.health + ' HP'
    },
    SupportFunctions: {
    	parent: null,
    	PreloadImages: function(arrImageData,strDirectoryPath){
    		var oGameState = this.parent;
			arrImageData.forEach(function(arrData){
				var strImageID = arrData[0];
				var strImagePath = strDirectoryPath + arrData[1];
				oGameState.game.load.image(strImageID, strImagePath);
			});
		},
		CreateUpgradePanelBitmap(){
			var oGameState = this.parent;
			var bmd = oGameState.game.add.bitmapData(250,500);
			bmd.ctx.fillStyle = '#9a783d';
			bmd.ctx.strokeStyle = '#35371c';
			bmd.ctx.lineWidth = 12;
			bmd.ctx.fillRect(0,0,250,500);
			bmd.ctx.strokeRect(0,0,250,500);
			return bmd;
		},
		CreateButtonBitmap(){
			var oGameState = this.parent;
			var buttonImage = oGameState.game.add.bitmapData(476,48);
			buttonImage.ctx.fillStyle = '#e6dec7';
			buttonImage.ctx.strokeStyle = '#35371c';
			buttonImage.ctx.lineWidth = 4;
			buttonImage.ctx.fillRect(0,0,225,48);
			buttonImage.ctx.strokeRect(0,0,225,48);
			return buttonImage;
		},
		BuildCoinsGroup: function(){
			var oGameState = this.parent;
			var oCoinsGroup = oGameState.add.group();
			oCoinsGroup.createMultiple(50, 'gold_coin', '', false);
			oCoinsGroup.setAll('inputEnabled', true);
			oCoinsGroup.setAll('goldValue', 1);
			oCoinsGroup.callAll('events.onInputDown.add','events.onInputDown', oGameState.onClickCoin, oGameState);
			return oCoinsGroup;
		},
		ReviveNextMonster: function(){
			var oGameState = this.parent;
			var oNextMonster = oGameState.monsters.getRandom();
			oNextMonster.revive(oNextMonster.maxHealth + ((oGameState.level-1) * 10.6));
			return oNextMonster;
		},
		BuildBackgroundGroup: function(arrBackgroundImageData){
			var oGameState = this.parent;
			var oBackgroundGroup = oGameState.game.add.group();
			arrBackgroundImageData.forEach(
				function(imageData){
					var bg = oGameState.game.add.tileSprite(0,0,oGameState.game.world.width,
						oGameState.game.world.height,imageData[0],'',oGameState.background);
					bg.tileScale.setTo(4,4);
				}
			);
			return oBackgroundGroup;
		},
		BuildMonsterGroup: function(arrMonsterData){
			var oGameState = this.parent;
			var oMonsterGroup = oGameState.game.add.group();
			var monster;
			arrMonsterData.forEach(function(data){
				monster = oMonsterGroup.create(1000, oGameState.game.world.centerY,data.image); // create a sprite off-screen
				monster.anchor.setTo(0.5); // center anchor
				monster.details = data; // reference to data
				monster.maxHealth = data.maxHealth;
				monster.health = monster.maxHealth; // use the built-in health component

				// hook into health and lifecycle events
				monster.events.onKilled.add(oGameState.onKilledMonster, oGameState);
				monster.events.onRevived.add(oGameState.onRevivedMonster, oGameState);

				// enable input so we can click it
				monster.inputEnabled = true;
				monster.events.onInputDown.add(oGameState.onClickMonster, oGameState);
			});
			return oMonsterGroup;
		},
		BuildDamageTextPool: function(){
			var oGameState = this.parent;
			var oDamageTextPool = oGameState.add.group();
			var damageText;
			for(var d=0; d<50; d++){
				damageText = oGameState.add.text(0,0,'1',{
					font: '64px Arial Black',
					fill: '#fff',
					strokeThickness: 4
				});
				// start out not existing so we don't draw it yet
				damageText.exists = false;
				damageText.tween = game.add.tween(damageText).to(
					{
						alpha: 0,
						y: 100,
						x: oGameState.game.rnd.integerInRange(100,700)
					}, 1000, Phaser.Easing.Cubic.Out);
				damageText.tween.onComplete.add(function(text, tween){
					text.kill();
				});
				oDamageTextPool.add(damageText);
			}
			return oDamageTextPool;
		},
		BuildMonsterInfoUIGroup: function(oMonsterNameText){
			var oGameState = this.parent;
			var oMonsterSettings = oGameState.SupportFunctions.GetMonsterSettings(oGameState);
			var oMonsterInfoUI = oGameState.game.add.group();
			var oMonsterNameText;
			var oMonsterHealthText;
			oMonsterInfoUI.position.setTo(oMonsterSettings.x - 220, oMonsterSettings.y + 120);
			oMonsterNameText = oMonsterInfoUI.addChild(oGameState.game.add.text(0,0,'',{
				font: '48px Arial Black',
				fill: '#fff',
				strokeThickness: 4
			}));
			oMonsterHealthText = oMonsterInfoUI.addChild(oGameState.game.add.text(0,80,'',{
				font: '32px Arial Black',
				fill: '#ff0000',
				strokeThickness: 4
			}));
			return [oMonsterInfoUI,oMonsterNameText,oMonsterHealthText];
		},
		GetMonsterSettings: function(){
			var oGameState = this.parent;
			var oMonsterSettings = {};
			oMonsterSettings.x = oGameState.game.world.centerX + oGameState.SupportData.htCurrentMonsterSettings.x_offset;
			oMonsterSettings.y = oGameState.game.world.centerY + oGameState.SupportData.htCurrentMonsterSettings.y_offset;
			return oMonsterSettings;
		}
	},
	SupportData: {
		htCurrentMonsterSettings: {
			x_offset: 100,
			y_offset: 0
		},
		arrItemImageData: [
			['gold_coin',		'I_GoldCoin.png'],
			['dagger',			'W_Dagger002.png']
		],
		arrBackgroundImageData: [
			['forest-back',		'parallax-forest-back-trees.png'],
			['forest-lights',	'parallax-forest-lights.png'],
			['forest-middle',	'parallax-forest-middle-trees.png'],
			['forest-front',	'parallax-forest-front-trees.png']
		],
		arrMonsterImageData: [
			['aerocephal',		'aerocephal.png'],
			['arcana_drake',	'arcana_drake.png'],
			['aurum_drakueli',	'aurum-drakueli.png'],
			['bat',				'bat.png'],
			['daemarbora',		'daemarbora.png'],
			['deceleon',		'deceleon.png'],
			['demonic_essence',	'demonic_essence.png'],
			['dune_crawler',	'dune_crawler.png'],
			['green_slime',		'green_slime.png'],
			['nagaruda',		'nagaruda.png'],
			['rat',				'rat.png'],
			['scorpion',		'scorpion.png'],
			['skeleton',		'skeleton.png'],
			['snake',			'snake.png'],
			['spider',			'spider.png'],
			['stygian_lizard',	'stygian_lizard.png']
		],
		arrMonsterData: [
			{name: 'Aerocephal',        image: 'aerocephal',        maxHealth: 10},
		    {name: 'Arcana Drake',      image: 'arcana_drake',      maxHealth: 20},
		    {name: 'Aurum Drakueli',    image: 'aurum_drakueli',    maxHealth: 30},
		    {name: 'Bat',               image: 'bat',               maxHealth: 5},
		    {name: 'Daemarbora',        image: 'daemarbora',        maxHealth: 10},
		    {name: 'Deceleon',          image: 'deceleon',          maxHealth: 10},
		    {name: 'Demonic Essence',   image: 'demonic_essence',   maxHealth: 15},
		    {name: 'Dune Crawler',      image: 'dune_crawler',      maxHealth: 8},
		    {name: 'Green Slime',       image: 'green_slime',       maxHealth: 3},
		    {name: 'Nagaruda',          image: 'nagaruda',          maxHealth: 13},
		    {name: 'Rat',               image: 'rat',               maxHealth: 2},
		    {name: 'Scorpion',          image: 'scorpion',          maxHealth: 2},
		    {name: 'Skeleton',          image: 'skeleton',          maxHealth: 6},
		    {name: 'Snake',             image: 'snake',             maxHealth: 4},
		    {name: 'Spider',            image: 'spider',            maxHealth: 4},
		    {name: 'Stygian Lizard',    image: 'stygian_lizard',    maxHealth: 20}
		],
		arrUpgradeButtonsData: [
			{icon: 'dagger',		name: 'Attack',			level: 1,	cost: 5,	purchaseHandler: function(button,player){player.clickDamage += 1}},
			{icon: 'swordIcon1',	name: 'Auto-Attack',	level: 0,	cost: 25,	purchaseHandler: function(button,player){player.dps += 5}}
		]
	}
});

oPlayState.SupportFunctions.parent = oPlayState;

game.state.start('play');

/*
STATE'S EVENT ORDER
https://github.com/photonstorm/phaser/blob/v2.4.2/src/core/State.js
init()			init is the very first function called when your State starts up. It's called before preload, create or anything else.
preload()
loadUpdate()
loadRender()
create()		create is called once preload has completed, this includes the loading of any assets from the Loader.
				If you don't have a preload method then create is the first method called in your State.

update()		It is called during the core game loop AFTER debug, physics, plugins and the Stage have had their preUpdate methods called.
				If is called BEFORE Stage, Tweens, Sounds, Input, Physics, Particles and Plugins have had their postUpdate methods called.

preRender()
render()		Nearly all display objects in Phaser render automatically, you don't need to tell them to render.
    			However the render method is called AFTER the game renderer and plugins have rendered, so you're able to do any
    			final post-processing style effects here. Note that this happens before plugins postRender takes place.

resize()		If your game is set to Scalemode RESIZE then each time the browser resizes it will call this function, passing in the new width and height.
paused()
resumed()
pauseUpdate()	pauseUpdate is called while the game is paused instead of preUpdate, update and postUpdate.
shutdown()		This method will be called when the State is shutdown (i.e. you switch to another state from this one).
*/
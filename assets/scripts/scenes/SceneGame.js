
const LoaderHelper = require('CCLoaderHelper');
const Game = require('Game');
const World = require('World');
const HudControl = require('HudControl');
const Preface = require('Preface');
const BattleField = require('BattleField');

const profile = require('GameProfile');
const GameSetting = require('GameSetting');

cc.Class({
    extends: cc.Component,

    properties: {
        hud: HudControl,
        world: World,
        mask: cc.Node,
        bg: cc.Node,
        battleField: BattleField,
    },

    onLoad () {
        this.world.node.on('change-floor', this.onChangeFloor, this);
        this.node.on('enter-battle-field', this.onEnterBattleField, this);
        this.battleField.node.on('battle-over', this.onBattleOver, this);
    },

    onDestroy () {
        cc.audioEngine.stopMusic();
    },

    start () {
        const lastFloor = profile.lastFloor;
        this.mask.active = true;
        this.mask.opacity = 255;
        Game.res.init()
            .then(() => this._doChangeFloor(lastFloor.id, true, lastFloor.upSymbol))
            .then(() => this._maskOut());
    },

    gotoFloor (floorId) {
        this.onChangeFloor({
            floorId: floorId,
            isUp: true,
        });
    },

    onEnterBattleField (event) {
        const monster = event.detail;
        this.battleField.node.active = true;
        this.battleField.resetBattleData(Game.player, monster);
        this.hud.enterBattleField();
        Game.audio.playMusic('battle');
    },

    onBattleOver (player, monster, isWin) {
        this.battleField.node.active = false;
        this.hud.exitBattleField();
        if (isWin) {
            this.world.removeEntity(monster.grid);
            this._getMonsterAward(monster);
        } else {
            this._checkUseRespawnItem();
            Game.audio.playEffect('lose');
        }
        Game.audio.playMusicBySceneId(Game.config.getSceneId(this._floorId));
    },

    _getMonsterAward (monster) {
        if (GameSetting.isDoubleExp) {
            monster.exp *= 2;
        }
        if (GameSetting.isDoubleGold) {
            monster.gold *= 2;
        }

        const player = Game.player;
        let exp = player.exp + monster.exp;
        if (player.level < Game.config.maxLevels && exp >= player.nextExp) {
            const nextLevelInfo = Game.data.getLevelInfo(player.level + 1);
            exp -= player.nextExp;
            player.exp = exp;
            player.nextExp = nextLevelInfo.nextExp;
            player.maxHp += nextLevelInfo.hp;
            player.hp = player.maxHp;
            player.attack += nextLevelInfo.attack;
            player.defence += nextLevelInfo.defence;
            player.level = player.level + 1;
            Game.openPanel('levelup', nextLevelInfo);
            Game.audio.playEffect('level-up');
        } else {
            player.exp = exp;
            Game.openPanel('win', monster);
            Game.audio.playEffect('win');
        }

        Game.bag.plusCoins(monster.gold);
        if (monster.item 
            && Game.taskState.isNeedItem(monster.item) 
            && !Game.bag.hasItem(monster.item)) {
            Game.bag.addItem(monster.item);
            Game.openPanel('get_item', monster.item);
        }
    },

    _checkUseRespawnItem () {
        if (Game.bag.hasItem(Game.config.ITEM_RESPAWN)) {
            Game.openPanel('lose', {
                confirmHandler: () => {
                    Game.bag.reduceItem(Game.config.ITEM_RESPAWN);
                    Game.player.hp = Game.player.maxHp;
                    Game.audio.playEffect('respawn');
                },
                cancelHandler: () => {
                    this._doRespawnHero();
                },
            });
        } else {
            this._doRespawnHero();
        }
    },

    onChangeFloor (exit) {
        if (!Game.taskState.isTaskEnd(Game.config.NPC_BEI_ER)) {
            return;
        }
        if (this._isChangingFloor) {
            return;
        }
        Game.audio.playEffect('change-floor');
        this._isChangingFloor = true;
        this._maskIn()
            .then(() => this._doChangeFloor(exit.floorId, exit.isUp, exit.symbol))
            .then(() => this._checkShowPreface(exit.floorId, exit.isUp))
            .then(() => this._maskOut())
            .then(() => this._isChangingFloor = false);
    },

    _doChangeFloor (floorId, isUp, symbol) {
        return Game.res.loadMapAssets(floorId)
            .then(() => this._loadBackground(floorId))
            .then(() => {
                this.world.initFloor(floorId, isUp, symbol);
                this.hud.changeSite(floorId);
                this._saveLastFloor(floorId, isUp, symbol);
                this._floorId = floorId;
                Game.closeAllPanel();
                Game.audio.playMusicBySceneId(Game.config.getSceneId(floorId));
            });
    },

    _doRespawnHero () {
        this._maskIn()
            .then(() => this._doChangeFloor(0, false))
            .then(() => this.world.respawnHero())
            .then(() => this._maskOut())
    },

    _checkShowPreface (floorId, isUp) {
        const config = Game.data.getPreface(floorId);
        if (!config || !isUp) {
            return;
        }
        return LoaderHelper.loadResByUrl('prefabs/game/preface').then(prefab => {
            const node = cc.instantiate(prefab);
            const preface = node.getComponent(Preface);
            node.parent = this.node;
            preface.title.spriteFrame = Game.res.getPrefaceTitleSpriteFrame(floorId);
            preface.icon.spriteFrame = Game.res.getPrefaceIconSpriteFrame(floorId);
            preface.text.string = config.text;
        });
    },

    _maskIn () {
        this.mask.active = true;
        return new Promise(resolve => {
            cc.tween(this.mask)
                .then(cc.fadeIn(0.5))
                .call(resolve)
                .start();
        });
    },

    _maskOut () {
        return new Promise(resolve => {
            cc.tween(this.mask)
                .then(cc.fadeOut(0.5))
                .call(resolve)
                .call(() => this.mask.active = false)
                .start();
        });
    },

    _loadBackground (floorId) {
        const path = `prefabs/game/${floorId == 0 ? 'home_bg' : 'tower_bg'}`;
        return LoaderHelper.loadResByUrl(path).then(prefab => {
            const node = cc.instantiate(prefab);
            this.bg.removeAllChildren();
            this.bg.addChild(node);

            // if (floorId == 0 && profile.maxFloorId > 0) {
            //     node.getChildByName('bubble').active = false;
            // }
        });
    },

    _saveLastFloor (floorId, isUp, symbol) {
        profile.lastFloor = {id: floorId};
        if (isUp) {
            profile.lastFloor.upSymbol = symbol;
        }
        if (floorId > profile.maxFloorId) {
            profile.maxFloorId = floorId;
        }
        profile.save();
    },
});

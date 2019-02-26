
const DataCenter = require('DataCenter');
const Resources = require('Resources');

const UiGetItem = cc.Class({
    extends: cc.Component,

    properties: {
        text: cc.Label,
        icon: cc.Sprite,
    },

    setItem (gid, message) {
        const data = DataCenter.instance.getMonster(gid);
        this.text.string = message || data.MESSAGE;
        this.icon.spriteFrame = Resources.instance.getSpriteFrame(gid);
    },

    onClickConfirm () {
        this.node.destroy();
    },
});

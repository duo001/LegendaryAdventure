
const State = cc.Enum({
    New: 0,         // 新的未接受的
    Accepted: 1,    // 已接受的，正在进行中
    Finished: 2,    // 已完成但未交接
    End: 3,         // 已交接，终止
});

const TaskState = cc.Class({
    ctor () {
        this._stateMap = new Map();
        this._needMap = new Map();
    },

    getTaskState (taskId) {
        taskId = Number.parseInt(taskId);
        return this._stateMap.get(taskId) || State.New;
    },

    setTaskState (taskId, state) {
        taskId = Number.parseInt(taskId);
        this._stateMap.set(taskId, state);
    },

    setNeedItem (taskId, itemGid) {
        taskId = Number.parseInt(taskId);
        itemGid = Number.parseInt(itemGid);
        this._needMap.set(taskId, itemGid);
    },

    getRunningTasks () {
        const tasks = [];
        for (let [taskId, state] of this._stateMap.entries()) {
            if (state == State.Accepted || state == State.Finished) {
                tasks.push({taskId, state});
            }
        }
        return tasks;
    },

    hasRunningTasks () {
        for (let [taskId, state] of this._stateMap.entries()) {
            if (state == State.Accepted || state == State.Finished) {
                return true;
            }
        }
        return false;
    },

    onGetItem (itemGid) {
        for (let [taskId, needGid] of this._needMap.entries()) {
            const state = this.getTaskState(taskId);
            if (itemGid == needGid && state == State.Accepted) {
                this.setTaskState(taskId, State.Finished);
                break;
            }
        }
    },
});

TaskState.TaskState = State;

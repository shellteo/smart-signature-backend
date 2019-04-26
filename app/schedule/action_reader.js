const Subscription = require('egg').Subscription;
const EOS = require('eosjs');
var _ = require('lodash');

const moment = require('moment');

/**
 *  read actions from eos blockchain
 */
class ActionReader extends Subscription {

  constructor(ctx) {
    super(ctx);
    this.eosClient = EOS({
      chainId: ctx.app.config.eos.chainId,
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });

    this.config = {
      startAt: ctx.app.config.eos.startAt,
      step: 20,
      watchAccount: ctx.app.config.eos.contract,
    }
  }

  static get schedule() {
    return {
      interval: '1s',
      type: 'all',
    };
  }

  async subscribe() {

    var start = this.app.cache || this.config.startAt;

    try {
      var sql = `select MAX(id) as id from actions`;
      var re = await this.app.mysql.query(sql);

      if (re && re[0]) {
        var id = re[0].id;
        if (id > start) {
          start = id;
        } else {
          console.log("in the end...will fetch last.")
        }
      }

    } catch (err) {
      console.log(err)
    }

    this.app.cache = start;

    console.log('sync actions .. start from id', start, "to id", (this.app.cache + this.config.step));

    var sqls = [];

    this.eosClient.getActions({

      account_name: this.config.watchAccount,
      pos: start,
      offset: this.config.step
    }).then(res => {

      res.actions.map(x => {

        var seq = x.account_action_seq;
        var act_account = x.action_trace.act.account;
        var act_receiver = x.action_trace.receipt.receiver;
        var act_name = x.action_trace.act.name;
        var act_data = "";

        var author = "";
        var memo = "";
        var amount = 0;
        var sign_id = null;

        var type = "other";
        const block_time = x.block_time;

        // bill type
        if (act_name === "bill" && act_account === this.config.watchAccount && act_receiver === this.config.watchAccount) {
          act_data = x.action_trace.act.data;

          author = act_data.owner;

          if (act_data.quantity) {
            amount = (act_data.quantity.split(" ")[0] - 0) * 10000;
          }

          sign_id = act_data.signId;
          type = "bill " + act_data.type;

          act_data = JSON.stringify(x.action_trace.act.data);
        }

        // 判断是打赏转账类型
        if (act_name == "transfer" && act_account == "eosio.token") {

          act_data = x.action_trace.act.data;

          memo = act_data.memo;

          var from = act_data.from;
          var to = act_data.to;
          amount = (act_data.quantity.split(" ")[0] - 0) * 10000;

          act_data = JSON.stringify(x.action_trace.act.data);

          if (to === this.config.watchAccount && memo.includes("share")) {
            type = "share";
            author = from; // 记录打赏人
            sign_id = memo.split(" ")[1];
          }

          if (to === this.config.watchAccount && memo.includes("support")) {
            type = "share";
            author = from; // 记录打赏人
            sign_id = memo.split(" ")[1];
          }
        }

        var sql = `INSERT INTO actions VALUES (${seq}, '${act_account}', '${act_name}', '${act_data}','${author}', '${memo}', '${amount}', '${sign_id}', '${type}', '${block_time}') ON DUPLICATE KEY UPDATE id='${seq}';`
        sqls.push(sql);

      })

      if (this.app.sqls && this.app.sqls.length > 0) {
        this.app.sqls = _.concat(this.app.sqls, sqls);
      } else {
        this.app.sqls = sqls
      }

    }).catch(e => {
      console.log(e)
    });

  }

}

module.exports = ActionReader;

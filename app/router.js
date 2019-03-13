'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  // 发布文章
  router.post('/publish', controller.post.publish);

  // 文章列表
  router.get('/posts', controller.post.posts);

  // 获取用户信息
  router.get('/user/:id', controller.user.user);

  // 分享
  router.post('/share', controller.share.share);

  // 打赏
  router.post('/vote', controller.vote.vote);


  // ipfs service
  router.post('/ipfs/add', controller.ipfs.add);
  router.post('/ipfs/addJSON', controller.ipfs.addJSON);

  router.get('/ipfs/cat/:hash', controller.ipfs.cat);
  router.get('/ipfs/catJSON/:hash', controller.ipfs.catJSON);

};


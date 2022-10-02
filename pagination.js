const {
  errBuilder,
  isDef,
  isvalidEmail,
  successHandler,
  errHandler,
} = require("../helpers");
const Boom = require("@hapi/boom");
const { isEmpty, trim, capitalize } = require("lodash");
const { User } = require("../models");
const { mongoose } = require("mongoose");

exports.getUsers = async (req, res, next) => {
  try {
    // let savedUsers = await User.find({}).lean();
    let next_cursor = req.query.next_cursor;
    let previous_cursor = req.query.previous_cursor;

    let query = {};
    if (isDef(next_cursor)) {
      query = {
        next_cursor: next_cursor,
      };
    }

    if (isDef(previous_cursor)) {
      query = {
        previous_cursor: previous_cursor,
      };
    }
    console.log({ query });
    let savedUsers = await getPaginatedResult(query);

    return successHandler(res, savedUsers, "User fetched successfully");
  } catch (error) {
    const resp = errBuilder(Boom.boomify(error));
    return next(resp);
  }
};

//if collection has unique field
const getPaginatedResult = async (query) => {
  query = query || {};

  let limit = +query.limit || 4;
  if (limit < 1) {
    limit = 20;
  }
  if (limit > 50) {
    limit = 50;
  }

  const q = {};
  const sort = { _id: -1 };
  if (query.previous_cursor) {
    q._id = { $gt: query.previous_cursor };
    sort._id = 1;
  } else if (query.next_cursor) {
    q._id = { $lt: query.next_cursor };
  }

  const data = await User.find(q, {}).sort(sort).limit(limit);
  if (query.previous_cursor) data.reverse();

  let hasNext, hasPrev, lastItem, firstItem;
  if (data.length) {
    lastItem = data[data.length - 1]._id;
    firstItem = data[0]._id;

    // If there is an item with id less than last item (remember, sort is in desc _id), there is a next page
    const q = { _id: { $lt: lastItem } };
    const r = await User.findOne(q);
    if (r) {
      hasNext = true;
    }
    // Short form:
    // hasNext = !!await db.collection('items').findOne(q)

    // If there is an item with id greater than first item (remember, sort is in desc _id), there is a previous page
    q._id = {
      $gt: firstItem,
    };
    hasPrev = !!(await User.findOne(q));
  }
  const response = {
    data,
  };
  if (hasNext) {
    response.next_cursor = `${lastItem}`;
  }
  if (hasPrev) {
    response.previous_cursor = `${firstItem}`;
  }

  return response;
};

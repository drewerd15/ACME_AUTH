const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
const JWT = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { TEXT } = require("sequelize");

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

Note.belongsTo(User);
User.hasMany(Note);

User.byToken = async (token) => {
  try {
    const res = JWT.verify(token, process.env.SECRET);
    const user = await User.findByPk(res.userId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  if (user) {
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      const token = JWT.sign({ userId: user.id }, process.env.SECRET);
      return token;
    } else {
      const error = Error("bad credentials");
      error.status = 401;
      throw error;
    }
  } else {
    const error = Error("Hey that's not a person");
    error.status = 401;
    throw error;
  }
};

User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 3);
  console.log(user.password);
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];

  const notes = [
    { text: "hello there" },
    { text: "hello world" },
    { text: "goodbye there" },
    { text: "goodbye world" },
  ];

  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  const [note1, note2, note3, note4] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  // console.log(User.prototype)
  await moe.setNotes([note1, note2]);
  await lucy.setNotes(note3);
  await larry.setNotes(note4);


  return {
    notes: {
      note1,
      note2,
      note3,
      note4,
    },
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};

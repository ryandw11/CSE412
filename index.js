const express = require('express');
const session = require('express-session');
const app = express();
const helmet = require('helmet');
const { Client } = require('pg');

// Setup the handlebars template engine.
const hbs = require('express-handlebars').engine({
    defaultLayout: 'main',
    extname: '.hbs',
    helpers: {
        static(path) {
            return path;
        },
        escapeJSString(str) {
            if (!str) {
                return null;
            }
            return jsesc(str, {
                escapeEverything: true,
                wrap: true
            });
        },
        // Custom functionality that allows a basic if statement.
        ifEq(a, b, opts) {
            if (a == null || b == null)
                return opts.inverse(this);
            if (a == b)
                return opts.fn(this);
            else
                return opts.inverse(this);
        },
        // Custom function that allows you to easily trim a string.
        trim(str, amount) {
            if (!str) {
                return null;
            }
            return str.slice(0, amount) + ((str.length > amount) ? "..." : "");
        },
        isEmpty(a, opts) {
            if (a == null)
                return opts.fn(this);
            if (a.length == 0)
                return opts.fn(this);
            else
                return opts.inverse(this);
        },
        surrWord(input, search) {
            let index = input.toLowerCase().indexOf(search.toLowerCase());

            if (index < 0) {
                return input.slice(0, 200);
            }

            let sectionOne = Math.max(0, index - 50);
            let sectionTwo = Math.min(input.length, index + 50);
            return (sectionOne != 0 ? "..." : "") + input.slice(sectionOne, index) + `<strong>${input.slice(index, index + search.length)}</strong>` + input.slice(index + search.length, sectionTwo) + (sectionTwo != input.length ? "..." : "");
        }
    }
});

// app.use(helmet());

app.engine('hbs', hbs);
app.set('view engine', 'hbs');

app.use(express.static(__dirname + '/public'));

app.use(session({
    secret: 'Fjejio#$734JF834w8FWE9329',
    resave: false,
    saveUninitialized: true,
    // Two Weeks
    cookie: {
        maxAge: 1.21e+9,
        // Enable secure mode if not in debug.
        secure: false
    }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const env = require('./environment.js');

app.listen(env.port, () => console.log(`Sever running debug on port ${env.port}...`));

// Setup database
const client = new Client(env.db);
client.connect();

/*

    Create Tables

*/

client.query(`
    CREATE TABLE IF NOT EXISTS users (
        userID SERIAL PRIMARY KEY NOT NULL,
        password VARCHAR(50) NOT NULL,
        profilePicture VARCHAR(300) NOT NULL,
        userName VARCHAR(100) NOT NULL
    );
`);

client.query(`
    CREATE TABLE IF NOT EXISTS game (
        gameID SERIAL PRIMARY KEY NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        gamePicture VARCHAR(300) NOT NULL,
        console VARCHAR(400) NOT NULL,
        userID INT NOT NULL,
        FOREIGN KEY(userID) REFERENCES users(userID) ON DELETE CASCADE
    );
`);

client.query(`
    CREATE TABLE IF NOT EXISTS comment (
        commentID SERIAL PRIMARY KEY NOT NULL,
        description TEXT NOT NULL,
        userID INT NOT NULL,
        gameID INT NOT NULL,
        FOREIGN KEY(userID) REFERENCES users(userID) ON DELETE CASCADE,
        FOREIGN KEY(gameID) REFERENCES game(gameID) ON DELETE CASCADE
    );
`);

client.query(`
    CREATE TABLE IF NOT EXISTS favorites (
        userID INT NOT NULL,
        gameID INT NOT NULL,
        FOREIGN KEY(userID) REFERENCES users(userID) ON DELETE CASCADE,
        FOREIGN KEY(gameID) REFERENCES game(gameID) ON DELETE CASCADE
    );
`);

client.query(`
    CREATE TABLE IF NOT EXISTS helpful (
        userID INT NOT NULL,
        commentID INT NOT NULL,
        FOREIGN KEY(userID) REFERENCES users(userID) ON DELETE CASCADE,
        FOREIGN KEY(commentID) REFERENCES comment(commentID) ON DELETE CASCADE
    );
`);

// app.use((req, res, next) => {
//     res.setHeader("Content-Security-Policy", "script-src 'self'");
//     return next();
// })

function isLoggedIn(req) {
    if (req.session.user == null)
        return false;

    return req.session.user.loggedin;
}

app.get("/", (req, res) => {
    let pageNumber = parseInt(req.query.pge);
    if (pageNumber == null || isNaN(pageNumber)) pageNumber = 1;
    if (pageNumber < 1) {
        res.redirect('/');
        return;
    }

    client.query(`SELECT * FROM game ORDER BY gameid DESC LIMIT 20 OFFSET ${(pageNumber - 1) * 20}`, (err, ress) => {
        if (err) {
            console.log(err);
        }

        client.query(`SELECT COUNT(*) AS count FROM game`, (err, result) => {

            const count = result.rows[0].count;
            if (pageNumber > Math.ceil(count / 20) && Math.ceil(count / 20) != 0) {
                res.redirect('/');
                return;
            }

            // The array of page numbers.
            let pages = [];
            // If there is a next page.
            let hasNext = pageNumber * 20 < count;
            // If there is a previous page.
            let hasPrev = (pageNumber - 2) * 20 >= 0;

            // This logic controls what numbers go in the array.
            if (hasPrev && hasNext) {
                pages = [pageNumber - 1, pageNumber, pageNumber + 1];
            } else if (hasNext) {
                pages = [pageNumber, pageNumber + 1];
                if ((pageNumber + 1) * 20 < count) pages.push(pageNumber + 2);
            } else if (hasPrev) {
                if ((pageNumber - 3) * 20 >= 0) pages = [pageNumber - 2, pageNumber - 1, pageNumber];
                else pages = [pageNumber - 1, pageNumber];
            }
            // If there is no next or previous page.
            else {
                pages = [pageNumber];
            }

            res.render("index", {
                games: ress.rows, page: 'home', user: req.session.user,
                pageData: {
                    pageNumber: pageNumber,
                    hasNext: hasNext,
                    hasPrev: hasPrev,
                    pages: pages,
                    nextPage: pageNumber + 1,
                    previousPage: pageNumber - 1,
                }
            });
        });
    });
});

app.get("/game/:game", (req, res) => {
    let game = req.params.game;

    if (game == null) {
        res.redirect("/");
        return;
    }

    client.query(`SELECT * FROM game WHERE gameid = ${game}`, (err, ress) => {
        if (ress.rowCount < 1) {
            res.redirect("/");
            return;
        }

        client.query(`SELECT * FROM comment WHERE gameid = ${game}`, (err, cress) => {
            res.render("game", { game: ress.rows[0], comments: cress.rows, user: req.session.user });
            return;
        });
    });
});

app.post("/game/comment/:gameid", (req, res) => {

    if(!isLoggedIn(req)) {
        res.redirect("/");
        return;
    }

    const gameid = req.params.gameid;
    const messagebody = req.body.description;

    if (gameid == null) {
        res.redirect("/");
        return;
    }
    if(messagebody == null || messagebody.length < 1) {
        res.redirect("/");
        return;
    } 

    client.query(`INSERT INTO comment (description, userid, gameid) VALUES ('${messagebody}', ${req.session.user.id}, ${gameid})`, (err, response) => {
        res.redirect(`/game/${gameid}`);
    });
});

app.get("/user/:user", (req, res) => {
    let userID = req.params.user;

    if (userID == null) {
        res.redirect("/");
        return;
    }

    client.query(`SELECT profilePicture, userName FROM users WHERE userid = ${userID}`, (err, ress) => {
        if (err) {
            res.send({ username: "error" });
            return;
        }
        res.send(ress.rows[0]);
    });
});

app.get("/upvote/:commentid", (req, res) => {
    let userID = req.params.commentid;

    if (userID == null) {
        res.redirect("/");
        return;
    }

    client.query(`SELECT COUNT(*) FROM helpful WHERE commentid = ${userID}`, (req, ress) => {
        res.send(ress.rows[0].count);
    });
});

app.get("/favorite-text/:game", (req, res) => {
    let game = req.params.game;

    if(!isLoggedIn(req)) {
        res.send("Login in to favorite!");
        return;
    }

    if (game == null) {
        res.send("Login in to favorite!");
        return;
    }

    client.query(`SELECT * FROM favorites WHERE gameid = ${game} AND userid = ${req.session.user.id}`, (req, ress) => {
        if (ress.rowCount == 0) {
            res.send("Favorite!");
        } else {
            res.send("Remove from Favorites!")
        }
    });
});

app.get("/helpful-comment/:gameid/:commentid", (req, res) => {

    const gameid = req.params.gameid;
    const commentID = req.params.commentid;

    if(!isLoggedIn(req)) {
        res.redirect(`/game/${gameid}#${commentID}`);
        return;
    }

    client.query(`SELECT * FROM helpful WHERE commentid = ${commentID} AND userid = ${req.session.user.id}`, (err, result)=> {
        if(result.rowCount > 0) {
            client.query(`DELETE FROM helpful WHERE commentid = ${commentID} AND userid = ${req.session.user.id}`, (err, result) => {
                res.redirect(`/game/${gameid}#${commentID}`);
            });
        } else {
            client.query(`INSERT INTO helpful (commentid, userid) VALUES (${commentID}, ${req.session.user.id})`, (err, result) => {
                res.redirect(`/game/${gameid}#${commentID}`);
            });
        }
    })
});

app.get("/favorite-game/:gameid", (req, res) => {

    const gameid = req.params.gameid;

    if(!isLoggedIn(req)) {
        res.redirect(`/game/${gameid}`);
        return;
    }

    client.query(`SELECT * FROM favorites WHERE gameid = ${gameid} AND userid = ${req.session.user.id}`, (err, result)=> {
        if(result.rowCount > 0) {
            client.query(`DELETE FROM favorites WHERE gameid = ${gameid} AND userid = ${req.session.user.id}`, (err, result) => {
                res.redirect(`/game/${gameid}`);
            });
        } else {
            client.query(`INSERT INTO favorites (gameid, userid) VALUES (${gameid}, ${req.session.user.id})`, (err, result) => {
                res.redirect(`/game/${gameid}`);
            });
        }
    })
});

app.get("/favorite-game/p/:gameid", (req, res) => {

    const gameid = req.params.gameid;

    if(!isLoggedIn(req)) {
        res.redirect(`/profile`);
        return;
    }

    client.query(`SELECT * FROM favorites WHERE gameid = ${gameid} AND userid = ${req.session.user.id}`, (err, result)=> {
        if(result.rowCount > 0) {
            client.query(`DELETE FROM favorites WHERE gameid = ${gameid} AND userid = ${req.session.user.id}`, (err, result) => {
                res.redirect(`/profile`);
            });
        } else {
            client.query(`INSERT INTO favorites (gameid, userid) VALUES (${gameid}, ${req.session.user.id})`, (err, result) => {
                res.redirect(`/profile`);
            });
        }
    })
});

app.get("/gamez/content/:gameid", (req, res) => {
    let gameID = req.params.gameid;

    if (gameID == null) {
        res.redirect("/");
        return;
    }

    client.query(`SELECT title, description FROM game WHERE gameid = ${gameID}`, (err, ress) => {
        res.send(ress.rows[0]);
    });
});

app.get("/login", (req, res) => {
    if (isLoggedIn(req)) {
        res.redirect("/profile");
        return;
    }

    res.render("login", { page: "login" });
});

app.get("/create-account", (req, res) => {
    if (isLoggedIn(req)) {
        res.redirect("/profile");
        return;
    }

    res.render("create-account", { page: "create-account" });
});

app.get("/signout", (req, res) => {
    delete req.session.user;

    res.redirect("/");
});

app.get("/profile/:user", (req, res) => {
    const user = req.params.user;

    if (isLoggedIn(req)) {
        if (req.session.user.id == user) {
            res.redirect("/profile");
            return;
        }
    }

    client.query(`SELECT * FROM users WHERE userid = ${user}`, (err, userResult) => {
        if (userResult.rowCount < 1) {
            res.redirect("/");
            return;
        }

        client.query(`SELECT * FROM game WHERE userid = ${user}`, (err, postResults) => {
            if (err) {
                res.redirect("/");
                return;
            }
            client.query(`SELECT game.* FROM game, favorites WHERE game.gameid = favorites.gameid AND favorites.userid = ${user}`, (err, favResults) => {
                if(err) {
                    res.redirect("/");
                    return;
                }
                client.query(`SELECT * FROM comment WHERE userid = ${user}`, (err, commentResults) => {
                    if (err) {
                        res.redirect("/");
                        return;
                    }
    
                    res.render("profile", { page: "profile", user: req.session.user, profile: userResult.rows[0], games: postResults.rows, favoriteGames: favResults.rows, comments: commentResults.rows });
    
                });
            });
        })
    });
});

app.get("/profile", (req, res) => {

    if (!isLoggedIn(req)) {
        res.redirect("/");
        return;
    }

    const user = req.session.user.id;

    client.query(`SELECT * FROM game WHERE userid = ${user}`, (err, postResults) => {
        if (err) {
            res.redirect("/");
            return;
        }
        client.query(`SELECT game.* FROM game, favorites WHERE game.gameid = favorites.gameid AND favorites.userid = ${user}`, (err, favResults) => {
            if(err) {
                res.redirect("/");
                return;
            }
            client.query(`SELECT * FROM comment WHERE userid = ${user}`, (err, commentResults) => {
                if (err) {
                    res.redirect("/");
                    return;
                }
    
                client.query(`SELECT * FROM users WHERE userid = ${user}`, (err, userResult) => {
                    if (err) {
                        res.redirect("/");
                        return;
                    }
    
                    res.render("myprofile", { page: "myprofile", user: req.session.user, games: postResults.rows, favoriteGames: favResults.rows, comments: commentResults.rows, profile: userResult.rows[0] });
                });
            });
        });
    });
});

app.get("/search", (req, res) => {
    const title = req.query.q;
    if (title == null) {
        res.redirect("/");
        return;
    }

    client.query(`SELECT * FROM game WHERE UPPER(description) LIKE UPPER('%${title}%') OR UPPER(title) LIKE UPPER('%${title}%') LIMIT 100`, (err, postResponse) => {
        client.query(`SELECT * FROM comment WHERE UPPER(description) LIKE UPPER('%${title}%') LIMIT 100`, (err, commentResponse) => {
            client.query(`SELECT * FROM users WHERE UPPER(username) LIKE UPPER('%${title}%') LIMIT 100`, (err, userResponse) => {
                res.render("search", { search: title, games: postResponse.rows, comments: commentResponse.rows, users: userResponse.rows, user: req.session.user });
            });
        });
    });
});

app.get("/add-game", (req, res) => {
    if (!isLoggedIn(req)) {
        res.redirect("/");
        return;
    }

    res.render("add-game", { user: req.session.user, page: "addgame" });
});

app.post("/add/game", (req, res) => {
    if (!isLoggedIn(req)) {
        res.redirect("/");
        return;
    }

    const title = req.body.title;
    const conzole = req.body.console;
    const picture = req.body.pic;
    const description = req.body.desc;

    if (title == null || title.length < 1) {
        res.redirect("/");
        return;
    }

    client.query(`INSERT INTO game (title, console, gamePicture, description, userID) VALUES ($1, $2, $3, $4, $5)`, 
        [title, conzole, picture, description, req.session.user.id], (err, result) => {
        if (err) {
            console.log(err);
            // res.redirect("/");
            // return;
        }

        res.redirect("/");
    });
});

app.post("/auth/login", (req, res) => {
    if (isLoggedIn(req)) {
        res.redirect("/profile");
        return;
    }

    // Not secure at all, DO NOT COPY.
    const {
        username,
        password
    } = req.body;

    client.query(`SELECT * FROM users WHERE password= '${password}' AND username = '${username}'`, (err, ress) => {
        if (ress.rowCount < 1) {
            res.redirect("/login?err=1");
            return;
        }

        const user = ress.rows[0];
        req.session.user = {
            loggedin: true,
            username: user.username,
            id: user.userid,
            isadmin: user.isadministrator
        };

        res.redirect("/");
    });
});

app.post("/auth/create-account", (req, res) => {
    if (isLoggedIn(req)) {
        res.redirect("/profile");
        return;
    }

    // Not secure at all, DO NOT COPY.
    const {
        username,
        password
    } = req.body;

    if (username.length < 3) {
        res.redirect("/create-account?err=1");
        return;
    }

    if (password.length < 3) {
        res.redirect("/create-account?err=2");
        return;
    }

    client.query(`SELECT * FROM users WHERE username='${username}'`, (err, resz) => {
        if (resz.rowCount > 0) {
            res.redirect("/create-account?err=3");
            return;
        }

        client.query(`INSERT INTO users (password, profilepicture, username) VALUES ('${password}', 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_3.png', '${username}')`, (err, ress) => {
            if (err) {
                res.redirect("/create-account?err=3");
            } else {
                console.log(ress);
                req.session.user = {
                    loggedin: true,
                    username: username
                };

                res.redirect("/");
            }
        });
    });
});

app.post("/settings", (req, res) => {
    if(!isLoggedIn(req)) {
        res.redirect("/");
        return;
    }

    const profilepic = req.body.profileimg;
    if(profilepic == null) {
        res.redirect("/");
        return;
    }

    client.query(`UPDATE users SET profilepicture = '${profilepic}' WHERE userid = ${req.session.user.id}`, (err, result) => {
        res.redirect("/profile?succ=1");
    });
});

app.get("/delete/game/:gameid", (req, res) => {
    if(!isLoggedIn(req)) {
        res.redirect("/");
        return;
    }

    const gameid = req.params.gameid;

    client.query(`SELECT * from game WHERE gameid = ${gameid}`, (err, postResponse) => {
        if(err || postResponse.rowCount < 1) {
            res.redirect("/#err");
        }

        if(postResponse.rows[0].userid != req.session.user.id) {
            res.redirect(`/game/${gameid}`);
            return;
        }
        client.query(`DELETE FROM game WHERE gameid = ${gameid}`, (err, postResponse) => {
            res.redirect("/?succ=1");
        });
    });
});
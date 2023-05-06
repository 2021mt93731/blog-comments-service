const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose')


const app = express();
app.use(bodyParser.json());
app.use(cors());

//const commentsByPostId = {};

main().catch(err => console.log(err));

async function main() {

    // Connect to MongoDB 
    await mongoose.connect('mongodb://mongo-db-svc:27017/comments-db');
    // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}


//{ id: commentId, content, postId: req.params.id, status: 'pending' }

// Create a schema 
const commentsSchema = new mongoose.Schema({
    postId: String,
    content: String,
    status: String
});

// Create a model based on the schema
const Comments = mongoose.model('Comments', commentsSchema);


app.get('/posts/:id/comments', async (req, res) => {

    // // with local object
    // // *************************************/
    //res.send(commentsByPostId[req.params.id] || []);
    // // *************************************/

    // with database
    //*************************************/
    try {
        const comments = await Comments.find({ postId: req.params.id });
        res.send(comments);
    } catch (err) {
        res.status(500).send({ error: 'Error retrieving comments' });
    }
    //*************************************/



});

app.post('/posts/:id/comments', async (req, res) => {

    // // with local object
    // // *************************************/
    // try {
    //     const commentId = randomBytes(4).toString('hex');
    //     const { content } = req.body;
    //     const comments = commentsByPostId[req.params.id] || [];
    //     comments.push({ id: commentId, content, status: 'pending' });
    //     commentsByPostId[req.params.id] = comments;

    //     await axios.post('http://event-bus-srv:4005/events', {
    //         //await axios.post('http://localhost:4005/events', {
    //         type: 'CommentCreated',
    //         //data: { id: comments._id, content: comments.content, postId: req.params.id, status: comments.status }
    //         data: { id: commentId, content, postId: req.params.id, status: 'pending' }
    //     })
    //     res.status(201).send(comments);

    // } catch (err) {
    //     res.status(500).send({ error: err.message });
    // }
    // // *************************************/


    // with database
    //*************************************/
    try {
        const comments = await Comments.create({
            postId: req.params.id,
            content: req.body.content,
            status: 'pending'
        });

        await axios.post('http://event-bus-srv:4005/events', {
            //await axios.post('http://localhost:4005/events', {
            type: 'CommentCreated',
            data: { id: comments._id, content: comments.content, postId: req.params.id, status: comments.status }
        })
        res.status(201).send(comments);

    } catch (err) {
        res.status(500).send({ error: err.message });
    }
    //*************************************/

});

app.post('/events', async (req, res) => {
    console.log('Received Event', req.body.type);

    const { type, data } = req.body;
    if (type === 'CommentModerated') {
        const { postId, id, status, content } = data;

        // // with local object
        // // *************************************/
        // const comments = commentsByPostId[postId];
        // const comment = comments.find(comment => {
        //     return comment.id === id
        // });
        // comment.status = status;
        // await axios.post('http://event-bus-srv:4005/events', {
        //     //await axios.post('http://localhost:4005/events', {
        //     type: 'CommentUpdated',
        //     data: { id, status, postId, content }
        // });
        // // *************************************/


        // with database
        //*************************************/
        try {
            const comments = await Comments.findOneAndUpdate(
                { _id: id },
                { status: status },
                { new: true }
            );
            console.log('Updated comments:', comments);
            await axios.post('http://event-bus-srv:4005/events', {
            //await axios.post('http://localhost:4005/events', {
                type: 'CommentUpdated',
                data: { id, status, postId, content }
            });

        } catch (err) {
            console.log(err);
        }
        //*************************************/

    }

    res.send({});

});


app.listen(4001, () => {
    console.log("listening on 4001");
});
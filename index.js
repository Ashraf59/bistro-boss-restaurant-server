const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT | 5000;

//middleware
app.use(cors());
app.use(express.json());

// Custom Middleware for JWT
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(req)
  if(!authorization){
    return res.status(401).send({error: true, message: 'unathorized access'})
  }
 
  //bearer token
  const token = authorization.split(' ')[1];
  console.log(token)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'unathorized access'})
    }

    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l1ydak8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db('BistroBossDB').collection('users');
    const menuCollection = client.db('BistroBossDB').collection('menu');
    const reviewsCollection = client.db('BistroBossDB').collection('reviews');
    const cartCollection = client.db('BistroBossDB').collection('carts');

    //JWT 
    app.post('/jwt', (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.send({token})
    })

    //verify Admin middleware

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      if(user?.role !== 'admin'){
        return res.status(403).send({error: true, message: 'forbidden message'})
      }
      next();

    }


    //users related api
    app.get('/users', verifyJWT, verifyAdmin, async(req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
      console.log(result)
    });

    app.post('/users', async(req, res) => {
      const user = req.body;
      console.log(user)
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query)
      console.log(existingUser)
      if(existingUser){
        return res.send({message: 'user is already exist'})
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    });

    //Security Layer:
    // 1. veryfyJWT
    // 2. email checking
    // 3. admin checking
    app.get('/users/admin/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({admin: false})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query) 
      const result = {admin: user?.role === 'admin'}
      res.send(result)
    })

    app.patch('/users/admin/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'

        },
      }

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)

    });
    
    //menu related api
    app.get('/menu', async(req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result);
    })

    app.post('/menu', verifyJWT, verifyAdmin, async (req, res) => {
      const newItem = req.body;
      const result = await menuCollection.insertOne(newItem)
      res.send(result)
    })

    app.delete('/menu/:id',verifyJWT, verifyAdmin,  async(req, res) => {
      const id = req.params.id;
      
      const result = await menuCollection.deleteOne({_id: new ObjectId(id)});
      res.send(result)
    })

      //reviews related apis
    app.get('/reviews', async(req, res) => {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
    })

    //cart collection
    app.get('/carts', verifyJWT, async(req, res) => {
      const email = req.query.email;
      // console.log(email)
      if(!email){
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error: true, message: 'forbidden access'})
      }

      const query = {email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/carts', async(req, res) => {
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/carts/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await cartCollection.deleteOne(query);
        res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Bisto Boss")
})

app.listen(port, () => {
    console.log(`Bistro Boss is running on port ${port}`)
})
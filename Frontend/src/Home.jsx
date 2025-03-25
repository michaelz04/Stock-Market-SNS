import { useContext, useState } from 'react'
import './Home.css'
import axios from 'axios'
import Navbar from './Navbar';
import { UserContext } from './App'

function Home() {
    const user = useContext(UserContext);
    console.log(user);

    return(
        <Navbar />
    )
}

export default Home;
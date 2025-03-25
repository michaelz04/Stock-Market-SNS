import { useContext, useState } from 'react'
import './Home.css'
import axios from 'axios'
import Navbar from './Navbar';
import { UserContext } from './App'

function Home() {
    const user = useContext(UserContext);
    console.log(user);

    return(
        <div className='Body'>
            <Navbar />
            <h2>
                Hello {user}
            </h2>
        </div>
    )
}

export default Home;
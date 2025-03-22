import { useState } from 'react'
import './Login.css'
import axios from 'axios'
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function handleLogin(event){
    event.preventDefault();
    axios.post('http://localhost:3001/login', {username, password}).then(res => {
      if(res.data == "success"){
        //go to home page
        console.log("to homepage");
        navigate('/home')
      } else {
        //display "invalid username and/or password"
        console.log("invalid username and/or password")
      }

    }).catch(err => console.log(err));
  }
  function handleRegister(event){
    event.preventDefault();
    axios.post('http://localhost:3001/register', {username, password}).then(res => {
      if(res.data == "success"){
        //go to home page
        console.log("to homepage")
        navigate('/home')
      } else {
        //display "username is taken"
        console.log("username is taken")
      }
      
    }).catch(err => console.log(err));
  }


  return (
    <div className='container'>
      <div className='header'>
        <h1>Login/Register</h1>
      </div>
      <div className='inputs'>
        <div className='input'>
          <input type="text" placeholder='Username' onChange={e=>setUsername(e.target.value)}/>
        </div>
        <div className='input'>
          <input type="text" placeholder='Password'onChange={e=>setPassword(e.target.value)}/>
        </div>
      </div>
      <div className='submit-container'>
        <div className='submit' onClick={handleRegister}>Register</div>
        <div className='submit' onClick={handleLogin}>Login</div>
      </div>
    </div>
  )
}

export default Login;

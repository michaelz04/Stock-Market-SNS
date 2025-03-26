import { useState, useContext } from 'react'
import './Login.css'
import axios from 'axios'
import { useNavigate } from 'react-router-dom';
import { UserContext } from './App'

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { setUser } = useContext(UserContext);

  const [loginError, setLoginError] = useState(false);
  const [registerError, setRegisterError] = useState(false);

  function handleLogin(event){
    event.preventDefault();
    axios.post('http://localhost:3001/login', {username, password}).then(res => {
      if(res.data.message == "Login success"){
        //go to home page
        setUser(username);
        navigate('/home');
      } else {
        //display "invalid username and/or password"
        setLoginError(true);
        console.log("invalid username and/or password");
      }

    }).catch(
      setLoginError(true),
      err => console.log(err)
    );
  }
  function handleRegister(event){
    event.preventDefault();

    if (username == "" || password == ""){
      setRegisterError(true)
      return;
    }
    axios.post('http://localhost:3001/register', {username, password}).then(res => {
      if(res.data.message == "User registered successfully"){
        //go to home page
        setUser(username);
        navigate('/home');
      } else {
        //display "username is taken"
        setRegisterError(true);
        console.log("username is taken");
      }
      
    }).catch(
      setRegisterError(true),
      err => console.log(err)
    );
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
      <div className='error'>
        {registerError && <p>Register error. Try again</p>}
        {loginError && <p>Login error. Try again</p>}
      </div>
    </div>
  )
}

export default Login;

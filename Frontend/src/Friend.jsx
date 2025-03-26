import { useContext } from 'react';
import { UserContext } from './App';

function Friend (){
    //const user = localStorage.getItem("user");
    const {user}  = useContext(UserContext);

    return(
        <div className='Body'>
            <h2>
                Hello mr {user}
            </h2>
        </div>
    )
}

export default Friend;
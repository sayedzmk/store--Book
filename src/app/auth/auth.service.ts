import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { environment } from "../../environments/environment";

import { User } from './user.model';
 export interface AuthResponseData{
    kind:string;
    idToken:string;
    email:string;
    refreshToken:string;
    expiresIn:string;
    localId:string;
    registered?:boolean;
}
@Injectable({
    providedIn:"root"
})
export class AuthService{
    user=new BehaviorSubject<User>(null);
    private tokenexpirationTime:any;
    constructor(private http:HttpClient ,private router:Router){}


    outoLogin(){
        const userData:{
            email:string;
            id:string;
            _token:string;
            _tokenExpirationData:string;
        }=JSON.parse(localStorage.getItem('userData'));
        if(!userData){
            return;
        }
        const loadedUser=new User(userData.email,userData.id,userData._token,new Date(userData._tokenExpirationData));

        if(loadedUser.token){
            this.user.next(loadedUser);
            const expirationDuration= new Date(userData._tokenExpirationData).getTime()- new Date().getTime();
            this.outoLogout(expirationDuration);

        }
    }
    logout(){
        this.user.next(null);
        this.router.navigate(['/auth']);
        localStorage.removeItem('userData');
        if(this.tokenexpirationTime){
            clearTimeout(this.tokenexpirationTime)
        }
        this.tokenexpirationTime=null;
    }
    outoLogout(expirationDuration){
      this.tokenexpirationTime=setTimeout(() => {
            this.logout();
        }, expirationDuration);
 
    }
    signup(email:string,password:string){
       return this.http.post<AuthResponseData>('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+environment.firebaseAPIKey,
        {
            email:email,
            password:password,
            returnSecureToken:true
        }
        ).pipe(catchError(this.handleError),tap(resData=>{
            this.handleAuthentication(resData.email,
                resData.localId,
                resData.idToken,
                +resData.expiresIn
                );
        })); 
    }
    login(email:string,password:string){
       return this.http.post<AuthResponseData>('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+environment.firebaseAPIKey,
        {
            email:email,
            password:password,
            returnSecureToken:true
        }
        ).pipe(catchError(this.handleError),tap(resData=>{
            this.handleAuthentication(resData.email,
                resData.localId,
                resData.idToken,
                +resData.expiresIn
                );
        })) ;
    }
    private handleAuthentication( email:string,userId:string,token:string,expiresIn:number){
        const expriationDate=new Date(new Date().getTime()+ expiresIn * 1000);
        const user =new User(email,userId,token,expriationDate);
        this.user.next(user);
        this.outoLogout(expiresIn*1000);
        localStorage.setItem('userData',JSON.stringify(user));

    }
    private handleError(errorRes:HttpErrorResponse){
        let errorMessage='An unknown error occurred!';
            if(!errorRes.error || !errorRes.error.error){
                return throwError(errorMessage);
            }
            switch(errorRes.error.error.message){
                case 'EMAIL_EXISTS':
                    errorMessage='This email exists already';
                    break;
                    case 'EMAIL_NOT_FOUND':
                        errorMessage='This email does not exists';
                        break;
                    case 'INVALID_PASSWORD':
                        errorMessage='This password is not correct';
                        break;
            }
            return throwError(errorMessage);
    }
}
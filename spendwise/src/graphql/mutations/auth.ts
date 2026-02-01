import { gql } from '@apollo/client';
import { USER_FRAGMENT } from '../fragments';

export const LOGIN = gql`
  ${USER_FRAGMENT}
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        ...UserFields
      }
    }
  }
`;

export const REGISTER = gql`
  ${USER_FRAGMENT}
  mutation Register($email: String!, $password: String!, $name: String) {
    register(email: $email, password: $password, name: $name) {
      token
      user {
        ...UserFields
      }
      requiresSetup
    }
  }
`;

export const UPDATE_PROFILE = gql`
  ${USER_FRAGMENT}
  mutation UpdateProfile($name: String, $image: String) {
    updateProfile(name: $name, image: $image) {
      ...UserFields
    }
  }
`;

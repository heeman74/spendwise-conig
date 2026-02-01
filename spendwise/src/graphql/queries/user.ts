import { gql } from '@apollo/client';
import { USER_FRAGMENT } from '../fragments';

export const GET_ME = gql`
  ${USER_FRAGMENT}
  query GetMe {
    me {
      ...UserFields
    }
  }
`;
